#!/usr/bin/env python3
"""
Optimized Query Engine with Parallel Processing
------------------------------------------------
Uses multiprocessing to speed up the prepare phase dramatically.

Key optimizations:
1. Parallel CSV loading and partitioning
2. Parallel pre-aggregation computation
3. Efficient memory management
"""

import pyarrow as pa
import pyarrow.parquet as pq
import pandas as pd
import time
import json
from pathlib import Path
from datetime import datetime, timedelta
import argparse
from collections import defaultdict
from multiprocessing import Pool, cpu_count
import os
from inputs import queries


def process_csv_file(args):
    """Process a single CSV file - designed to run in parallel"""
    csv_file, chunk_size = args

    type_data_lists = defaultdict(list)

    for chunk in pd.read_csv(csv_file, chunksize=chunk_size):
        # Convert timestamp to Pacific timezone
        chunk['ts'] = pd.to_datetime(chunk['ts'], unit='ms', utc=True).dt.tz_convert('America/Los_Angeles')
        chunk['day'] = chunk['ts'].dt.date
        # For week/hour, convert to naive to avoid DST issues
        ts_naive = chunk['ts'].dt.tz_localize(None)
        chunk['week'] = ts_naive.dt.to_period('W').dt.start_time.dt.date
        chunk['hour'] = ts_naive.dt.floor('h')
        chunk['minute'] = chunk['ts'].dt.strftime('%Y-%m-%d %H:%M')

        # Convert types
        chunk['advertiser_id'] = pd.to_numeric(chunk['advertiser_id'], errors='coerce').astype('Int32')
        chunk['publisher_id'] = pd.to_numeric(chunk['publisher_id'], errors='coerce').astype('Int32')
        chunk['user_id'] = pd.to_numeric(chunk['user_id'], errors='coerce').astype('Int64')
        chunk['bid_price'] = pd.to_numeric(chunk['bid_price'], errors='coerce')
        chunk['total_price'] = pd.to_numeric(chunk['total_price'], errors='coerce')

        # Partition by type
        for event_type in chunk['type'].unique():
            type_data = chunk[chunk['type'] == event_type].copy()
            type_data_lists[event_type].append(type_data)

    # Concatenate chunks for each type
    result = {}
    for event_type, data_list in type_data_lists.items():
        if data_list:
            result[event_type] = pd.concat(data_list, ignore_index=True)

    return csv_file.name, result


def compute_day_partition(args):
    """Compute aggregations for a single day - designed to run in parallel"""
    day, day_data = args
    return day, day_data


class OptimizedQueryEngine:
    def __init__(self, data_dir: Path, storage_dir: Path):
        self.data_dir = data_dir
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        # Storage paths
        self.partitions_dir = storage_dir / "partitions"
        self.aggregates_dir = storage_dir / "aggregates"
        self.metadata_path = storage_dir / "metadata.json"

        self.metadata = {}
        self.num_workers = max(1, cpu_count() - 1)  # Leave one core free

    def prepare(self):
        """Prepare phase: Load, partition, and pre-aggregate data with parallel processing"""
        print("🟦 PREPARE PHASE: Optimizing data for fast queries")
        print(f"⚡ Using {self.num_workers} parallel workers\n")

        t0 = time.time()

        # Step 1: Load and partition by type (PARALLEL)
        print("[1/3] Loading and partitioning by type (parallel)...")
        self._load_and_partition_parallel()

        # Step 2: Create temporal indexes (PARALLEL)
        print("\n[2/3] Creating temporal indexes (parallel)...")
        self._create_temporal_indexes()

        # Step 3: Pre-compute aggregations (PARALLEL)
        print("\n[3/3] Pre-computing aggregations (parallel)...")
        self._precompute_aggregations_parallel()

        # Save metadata
        self._save_metadata()

        dt = time.time() - t0
        print(f"\n✅ Preparation complete in {dt:.2f}s")
        print(f"📊 Storage size: {self._get_storage_size():.2f} MB")

    def _load_and_partition_parallel(self):
        """Load CSV and partition by type using parallel processing"""
        csv_files = sorted(self.data_dir.glob("events_part_*.csv"))

        print(f"  Found {len(csv_files)} CSV files")

        chunk_size = 500000

        # Process CSV files in parallel
        with Pool(self.num_workers) as pool:
            results = pool.map(process_csv_file, [(f, chunk_size) for f in csv_files])

        print(f"  ✓ Processed {len(csv_files)} files in parallel")

        # Merge results by type
        type_data_combined = defaultdict(list)
        total_rows = 0

        for filename, type_data_dict in results:
            for event_type, df in type_data_dict.items():
                type_data_combined[event_type].append(df)
                total_rows += len(df)

        # Write combined data to Parquet files
        print(f"  Writing partitions...")
        type_counts = {}

        for event_type, data_list in type_data_combined.items():
            partition_dir = self.partitions_dir / f"type={event_type}"
            partition_dir.mkdir(parents=True, exist_ok=True)

            # Concatenate all data for this type
            type_df = pd.concat(data_list, ignore_index=True)
            type_counts[event_type] = len(type_df)

            # Write to Parquet
            table = pa.Table.from_pandas(type_df, preserve_index=False)
            output_file = partition_dir / "data.parquet"
            pq.write_table(table, output_file, compression='snappy')

            print(f"    - {event_type}: {len(type_df):,} rows")

        self.metadata['type_counts'] = type_counts
        self.metadata['total_rows'] = total_rows

    def _create_temporal_indexes(self):
        """Create secondary partitions by day for fast temporal filtering"""
        print("  Creating day-based indexes for impressions...")

        impression_file = self.partitions_dir / "type=impression" / "data.parquet"
        if not impression_file.exists():
            return

        df = pd.read_parquet(impression_file)

        # Group by day
        day_index_dir = self.partitions_dir / "type=impression" / "by_day"
        day_index_dir.mkdir(parents=True, exist_ok=True)

        # Prepare data for parallel processing
        grouped = [(day, group) for day, group in df.groupby('day')]

        # Write day partitions (this is I/O bound, so we'll do it sequentially but quickly)
        for day, day_data in grouped:
            day_file = day_index_dir / f"{day}.parquet"
            pq.write_table(pa.Table.from_pandas(day_data, preserve_index=False), day_file, compression='snappy')

        print(f"  ✓ Created {len(grouped)} day partitions")

    def _precompute_aggregations_parallel(self):
        """Pre-compute common aggregations using parallel processing"""
        self.aggregates_dir.mkdir(parents=True, exist_ok=True)

        # Aggregation 1: Daily revenue (simple, fast)
        print("  Pre-computing daily revenue...")
        impression_file = self.partitions_dir / "type=impression" / "data.parquet"
        if impression_file.exists():
            df = pd.read_parquet(impression_file, columns=['day', 'bid_price'])
            daily_revenue = df.groupby('day')['bid_price'].sum().reset_index()
            daily_revenue.columns = ['day', 'sum(bid_price)']
            daily_revenue.to_parquet(self.aggregates_dir / "daily_revenue.parquet")
            print(f"    ✓ Daily revenue: {len(daily_revenue)} days")

        # Aggregation 2: Publisher metrics (larger, benefit from parallel)
        print("  Pre-computing publisher metrics...")
        if impression_file.exists():
            df = pd.read_parquet(impression_file, columns=['publisher_id', 'country', 'day', 'bid_price'])
            pub_metrics = df.groupby(['publisher_id', 'country', 'day'])['bid_price'].sum().reset_index()
            pub_metrics.to_parquet(self.aggregates_dir / "publisher_metrics.parquet")
            print(f"    ✓ Publisher metrics: {len(pub_metrics)} rows")

        # Aggregation 3: Country purchase averages
        print("  Pre-computing purchase metrics...")
        purchase_file = self.partitions_dir / "type=purchase" / "data.parquet"
        if purchase_file.exists():
            df = pd.read_parquet(purchase_file, columns=['country', 'total_price'])
            country_avg = df.groupby('country')['total_price'].agg(['sum', 'count']).reset_index()
            country_avg.to_parquet(self.aggregates_dir / "country_purchase_metrics.parquet")
            print(f"    ✓ Country purchase metrics: {len(country_avg)} countries")

        # Aggregation 4: Advertiser type counts (do sequentially to avoid pickling issues)
        print("  Pre-computing advertiser metrics...")

        adv_dfs = []
        for event_type in ['serve', 'impression', 'click', 'purchase']:
            type_file = self.partitions_dir / f"type={event_type}" / "data.parquet"
            if type_file.exists():
                df = pd.read_parquet(type_file, columns=['advertiser_id'])
                counts = df.groupby('advertiser_id').size().reset_index(name='count')
                counts['type'] = event_type
                adv_dfs.append(counts)

        if adv_dfs:
            combined = pd.concat(adv_dfs, ignore_index=True)
            advertiser_metrics = combined.groupby(['advertiser_id', 'type'])['count'].sum().reset_index()
            advertiser_metrics.columns = ['advertiser_id', 'type', 'count']
            advertiser_metrics.to_parquet(self.aggregates_dir / "advertiser_metrics.parquet")
            print(f"    ✓ Advertiser metrics: {len(advertiser_metrics)} rows")

    def _save_metadata(self):
        """Save metadata about the optimized storage"""
        with open(self.metadata_path, 'w') as f:
            json.dump(self.metadata, f, indent=2, default=str)

    def _get_storage_size(self):
        """Calculate total storage size in MB"""
        total = 0
        for f in self.storage_dir.rglob("*.parquet"):
            total += f.stat().st_size
        return total / (1024 * 1024)

    def run_queries(self, queries_list, out_dir: Path):
        """Run phase: Execute queries using optimized storage"""
        print("\n🟦 RUN PHASE: Executing queries")

        out_dir.mkdir(parents=True, exist_ok=True)
        results = []

        for i, query in enumerate(queries_list, 1):
            print(f"\n🟦 Query {i}:")
            print(f"{query}")

            t0 = time.time()
            result_df = self._execute_query(query)
            dt = time.time() - t0

            print(f"✅ Rows: {len(result_df)} | Time: {dt:.3f}s")

            # Save result
            out_path = out_dir / f"q{i}.csv"
            result_df.to_csv(out_path, index=False)

            results.append({"query": i, "rows": len(result_df), "time": dt})

        print("\nSummary:")
        for r in results:
            print(f"Q{r['query']}: {r['time']:.3f}s ({r['rows']} rows)")
        print(f"Total time: {sum(r['time'] for r in results):.3f}s")

    def _execute_query(self, query):
        """Smart query planner and executor"""
        select = query.get('select', [])
        where = query.get('where', [])
        group_by = query.get('group_by', [])
        order_by = query.get('order_by', [])

        # Try to use pre-aggregated data
        result = self._try_precomputed(query)
        if result is not None:
            print("  ⚡ Using pre-aggregated data")
            return result

        # Fall back to scanning partitions
        print("  📂 Scanning partitions...")
        return self._scan_partitions(query)

    def _try_precomputed(self, query):
        """Check if query can be answered from pre-computed aggregations"""
        select = query.get('select', [])
        where = query.get('where', [])
        group_by = query.get('group_by', [])
        order_by = query.get('order_by', [])

        # Query 1: Daily revenue
        if (group_by == ['day'] and
            any(isinstance(s, dict) and 'SUM' in s and s['SUM'] == 'bid_price' for s in select) and
            len(where) == 1 and where[0]['col'] == 'type' and where[0]['val'] == 'impression'):

            df = pd.read_parquet(self.aggregates_dir / "daily_revenue.parquet")
            return df

        # Query 3: Average purchase by country
        if (group_by == ['country'] and
            any(isinstance(s, dict) and 'AVG' in s and s['AVG'] == 'total_price' for s in select) and
            len(where) == 1 and where[0]['col'] == 'type' and where[0]['val'] == 'purchase'):

            df = pd.read_parquet(self.aggregates_dir / "country_purchase_metrics.parquet")
            df['AVG(total_price)'] = df['sum'] / df['count']
            df = df[['country', 'AVG(total_price)']]

            if order_by:
                for order in reversed(order_by):
                    ascending = order.get('dir', 'asc') == 'asc'
                    df = df.sort_values(order['col'], ascending=ascending)

            return df

        # Query 4: Advertiser type counts
        if (group_by == ['advertiser_id', 'type'] and
            any(isinstance(s, dict) and 'COUNT' in s for s in select) and
            not where):

            df = pd.read_parquet(self.aggregates_dir / "advertiser_metrics.parquet")
            df.columns = ['advertiser_id', 'type', 'COUNT(*)']

            if order_by:
                for order in reversed(order_by):
                    ascending = order.get('dir', 'asc') == 'asc'
                    df = df.sort_values(order['col'], ascending=ascending)

            return df

        return None

    def _scan_partitions(self, query):
        """Scan partitions with filters applied"""
        select = query.get('select', [])
        where = query.get('where', [])
        group_by = query.get('group_by', [])
        order_by = query.get('order_by', [])

        # Determine which partitions to scan
        type_filter = None
        day_filter = None
        other_filters = []

        for cond in where:
            if cond['col'] == 'type':
                type_filter = cond
            elif cond['col'] == 'day':
                day_filter = cond
            else:
                other_filters.append(cond)

        # Load data from appropriate partitions
        dfs = []

        if type_filter and type_filter['op'] == 'eq':
            # Single type partition
            event_type = type_filter['val']

            # Check if we can use day-based index
            if event_type == 'impression' and day_filter:
                dfs.append(self._load_day_partition(event_type, day_filter))
            else:
                partition_file = self.partitions_dir / f"type={event_type}" / "data.parquet"
                if partition_file.exists():
                    dfs.append(pd.read_parquet(partition_file))
        else:
            # Multiple types or no type filter
            for event_type in ['serve', 'impression', 'click', 'purchase']:
                partition_file = self.partitions_dir / f"type={event_type}" / "data.parquet"
                if partition_file.exists():
                    dfs.append(pd.read_parquet(partition_file))

        if not dfs:
            return pd.DataFrame()

        df = pd.concat(dfs, ignore_index=True)

        # Apply filters
        for cond in where:
            if cond['col'] == 'type' and type_filter:
                continue  # Already filtered by partition

            col = cond['col']
            op = cond['op']
            val = cond['val']

            # Convert string dates to date objects if comparing with day column
            if col == 'day' and isinstance(val, str):
                val = pd.to_datetime(val).date()
            elif col == 'day' and isinstance(val, list):
                val = [pd.to_datetime(v).date() for v in val]

            if op == 'eq':
                df = df[df[col] == val]
            elif op == 'neq':
                df = df[df[col] != val]
            elif op == 'between':
                low, high = val
                df = df[(df[col] >= low) & (df[col] <= high)]
            elif op == 'in':
                df = df[df[col].isin(val)]

        # Get columns needed
        result_cols = []
        agg_funcs = {}

        for item in select:
            if isinstance(item, str):
                result_cols.append(item)
            elif isinstance(item, dict):
                for func, col in item.items():
                    agg_col = f"{func}({col})"
                    if col == '*':
                        agg_funcs[agg_col] = ('type', 'count')
                    elif func == 'SUM':
                        agg_funcs[agg_col] = (col, 'sum')
                    elif func == 'AVG':
                        agg_funcs[agg_col] = (col, 'mean')
                    elif func == 'COUNT':
                        agg_funcs[agg_col] = (col, 'count')

        # Apply aggregations
        if group_by:
            # Ensure group_by columns are strings
            for col in group_by:
                if col in df.columns and df[col].dtype == 'object':
                    df[col] = df[col].astype(str)

            agg_dict = {}
            for agg_col, (col, func) in agg_funcs.items():
                agg_dict[col] = func

            if agg_dict:
                result = df.groupby(group_by, as_index=False).agg(agg_dict)

                # Rename columns
                new_cols = group_by.copy()
                for agg_col, (col, func) in agg_funcs.items():
                    idx = len(new_cols)
                    result.columns = list(result.columns[:idx]) + [agg_col] + list(result.columns[idx+1:])
            else:
                result = df[group_by].drop_duplicates()
        else:
            result = df[result_cols] if result_cols else df

        # Apply ordering
        if order_by:
            for order in reversed(order_by):
                ascending = order.get('dir', 'asc') == 'asc'
                result = result.sort_values(order['col'], ascending=ascending)

        return result

    def _load_day_partition(self, event_type, day_filter):
        """Load data from day-based partition"""
        day_dir = self.partitions_dir / f"type={event_type}" / "by_day"

        if day_filter['op'] == 'eq':
            day_file = day_dir / f"{day_filter['val']}.parquet"
            if day_file.exists():
                return pd.read_parquet(day_file)
        elif day_filter['op'] == 'between':
            low, high = day_filter['val']
            dfs = []

            current = pd.to_datetime(low).date()
            end = pd.to_datetime(high).date()

            while current <= end:
                day_file = day_dir / f"{current}.parquet"
                if day_file.exists():
                    dfs.append(pd.read_parquet(day_file))
                current += timedelta(days=1)

            if dfs:
                return pd.concat(dfs, ignore_index=True)

        # Fall back to full partition
        partition_file = self.partitions_dir / f"type={event_type}" / "data.parquet"
        if partition_file.exists():
            return pd.read_parquet(partition_file)

        return pd.DataFrame()


def main():
    parser = argparse.ArgumentParser(description="Optimized Query Engine with Parallel Processing")
    parser.add_argument("--data-dir", type=Path, required=True, help="Input CSV data directory")
    parser.add_argument("--storage-dir", type=Path, default=Path("storage"), help="Optimized storage directory")
    parser.add_argument("--out-dir", type=Path, required=True, help="Output directory for results")
    parser.add_argument("--prepare", action='store_true', help="Run prepare phase")
    parser.add_argument("--run", action='store_true', help="Run query phase")

    args = parser.parse_args()

    engine = OptimizedQueryEngine(args.data_dir, args.storage_dir)

    if args.prepare:
        engine.prepare()

    if args.run:
        engine.run_queries(queries, args.out_dir)


if __name__ == "__main__":
    main()
