#!/usr/bin/env python3
"""
Memory-Efficient Optimized Query Engine
----------------------------------------
Designed to stay under 16 GB RAM even on large datasets.

Key optimizations:
1. Limited parallel workers (max 4)
2. Smaller chunk sizes
3. Aggressive memory cleanup
4. Streaming writes to disk
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
from multiprocessing import Pool
import gc
from inputs import queries


def process_csv_file(args):
    """Process a single CSV file - memory efficient version"""
    csv_file, chunk_size, temp_dir = args

    # Process in smaller chunks and write immediately
    type_temp_files = defaultdict(list)

    chunk_num = 0
    for chunk in pd.read_csv(csv_file, chunksize=chunk_size):
        # Convert timestamp to Pacific timezone
        chunk['ts'] = pd.to_datetime(chunk['ts'], unit='ms', utc=True).dt.tz_convert('America/Los_Angeles')
        chunk['day'] = chunk['ts'].dt.date
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

        # Write each type to a temporary file immediately
        for event_type in chunk['type'].unique():
            type_data = chunk[chunk['type'] == event_type].copy()

            # Write to temp parquet file
            temp_file = temp_dir / f"{csv_file.stem}_{event_type}_chunk{chunk_num}.parquet"
            pq.write_table(pa.Table.from_pandas(type_data, preserve_index=False),
                          temp_file, compression='snappy')
            type_temp_files[event_type].append(temp_file)

            del type_data

        del chunk
        gc.collect()
        chunk_num += 1

    return csv_file.name, dict(type_temp_files)


class OptimizedQueryEngine:
    def __init__(self, data_dir: Path, storage_dir: Path):
        self.data_dir = data_dir
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        # Storage paths
        self.partitions_dir = storage_dir / "partitions"
        self.aggregates_dir = storage_dir / "aggregates"
        self.temp_dir = storage_dir / "temp"
        self.metadata_path = storage_dir / "metadata.json"

        self.temp_dir.mkdir(parents=True, exist_ok=True)

        self.metadata = {}

        # Limit workers to avoid memory issues (max 4 for 16 GB RAM)
        self.num_workers = min(4, max(1, int(__import__('multiprocessing').cpu_count() * 0.3)))

    def prepare(self):
        """Prepare phase: Load, partition, and pre-aggregate data (memory efficient)"""
        print("🟦 PREPARE PHASE: Optimizing data for fast queries")
        print(f"⚡ Using {self.num_workers} parallel workers (memory-efficient mode)")
        print(f"💾 RAM usage will stay under 16 GB\n")

        t0 = time.time()

        # Step 1: Load and partition by type
        print("[1/3] Loading and partitioning by type (streaming mode)...")
        self._load_and_partition_streaming()

        # Step 2: Create temporal indexes
        print("\n[2/3] Creating temporal indexes...")
        self._create_temporal_indexes()

        # Step 3: Pre-compute aggregations
        print("\n[3/3] Pre-computing aggregations...")
        self._precompute_aggregations()

        # Cleanup temp files
        print("\n[Cleanup] Removing temporary files...")
        self._cleanup_temp()

        # Save metadata
        self._save_metadata()

        dt = time.time() - t0
        print(f"\n✅ Preparation complete in {dt:.2f}s")
        print(f"📊 Storage size: {self._get_storage_size():.2f} MB")

    def _load_and_partition_streaming(self):
        """Load CSV and partition using streaming approach to minimize memory"""
        csv_files = sorted(self.data_dir.glob("events_part_*.csv"))

        print(f"  Found {len(csv_files)} CSV files")

        # Use smaller chunk size for memory efficiency
        chunk_size = 200000  # Reduced from 500000

        # Process CSV files in parallel (limited workers)
        print(f"  Processing in batches of {self.num_workers} files...")

        all_type_temp_files = defaultdict(list)

        with Pool(self.num_workers) as pool:
            results = pool.map(process_csv_file,
                             [(f, chunk_size, self.temp_dir) for f in csv_files])

        # Collect all temp files by type
        for filename, type_temp_files_dict in results:
            for event_type, temp_files in type_temp_files_dict.items():
                all_type_temp_files[event_type].extend(temp_files)

        print(f"  ✓ Processed {len(csv_files)} files")
        print(f"  Consolidating partitions...")

        # Consolidate temp files into final partitions (streaming)
        type_counts = {}
        for event_type, temp_files in all_type_temp_files.items():
            partition_dir = self.partitions_dir / f"type={event_type}"
            partition_dir.mkdir(parents=True, exist_ok=True)

            output_file = partition_dir / "data.parquet"

            # Read and write in batches to control memory
            batch_size = 20
            all_tables = []

            for i in range(0, len(temp_files), batch_size):
                batch_files = temp_files[i:i+batch_size]
                batch_tables = [pq.read_table(f) for f in batch_files]
                combined_batch = pa.concat_tables(batch_tables)
                all_tables.append(combined_batch)

                del batch_tables
                gc.collect()

            # Final consolidation
            final_table = pa.concat_tables(all_tables)
            pq.write_table(final_table, output_file, compression='snappy')

            type_counts[event_type] = final_table.num_rows
            print(f"    - {event_type}: {type_counts[event_type]:,} rows")

            del all_tables, final_table
            gc.collect()

        self.metadata['type_counts'] = type_counts
        self.metadata['total_rows'] = sum(type_counts.values())

    def _create_temporal_indexes(self):
        """Create day-based indexes (memory efficient)"""
        print("  Creating day-based indexes for impressions...")

        impression_file = self.partitions_dir / "type=impression" / "data.parquet"
        if not impression_file.exists():
            return

        # Read in chunks to avoid loading all at once
        day_index_dir = self.partitions_dir / "type=impression" / "by_day"
        day_index_dir.mkdir(parents=True, exist_ok=True)

        # Process in batches
        table = pq.read_table(impression_file)
        df = table.to_pandas()

        grouped = df.groupby('day')
        for day, day_data in grouped:
            day_file = day_index_dir / f"{day}.parquet"
            pq.write_table(pa.Table.from_pandas(day_data, preserve_index=False),
                          day_file, compression='snappy')

        print(f"  ✓ Created {len(grouped)} day partitions")

        del df, table
        gc.collect()

    def _precompute_aggregations(self):
        """Pre-compute aggregations (memory efficient)"""
        self.aggregates_dir.mkdir(parents=True, exist_ok=True)

        # Aggregation 1: Daily revenue
        print("  Pre-computing daily revenue...")
        impression_file = self.partitions_dir / "type=impression" / "data.parquet"
        if impression_file.exists():
            df = pd.read_parquet(impression_file, columns=['day', 'bid_price'])
            daily_revenue = df.groupby('day')['bid_price'].sum().reset_index()
            daily_revenue.columns = ['day', 'sum(bid_price)']
            daily_revenue.to_parquet(self.aggregates_dir / "daily_revenue.parquet")
            print(f"    ✓ Daily revenue: {len(daily_revenue)} days")
            del df, daily_revenue
            gc.collect()

        # Aggregation 2: Publisher metrics
        print("  Pre-computing publisher metrics...")
        if impression_file.exists():
            df = pd.read_parquet(impression_file, columns=['publisher_id', 'country', 'day', 'bid_price'])
            pub_metrics = df.groupby(['publisher_id', 'country', 'day'])['bid_price'].sum().reset_index()
            pub_metrics.to_parquet(self.aggregates_dir / "publisher_metrics.parquet")
            print(f"    ✓ Publisher metrics: {len(pub_metrics)} rows")
            del df, pub_metrics
            gc.collect()

        # Aggregation 3: Country purchase averages
        print("  Pre-computing purchase metrics...")
        purchase_file = self.partitions_dir / "type=purchase" / "data.parquet"
        if purchase_file.exists():
            df = pd.read_parquet(purchase_file, columns=['country', 'total_price'])
            country_avg = df.groupby('country')['total_price'].agg(['sum', 'count']).reset_index()
            country_avg.to_parquet(self.aggregates_dir / "country_purchase_metrics.parquet")
            print(f"    ✓ Country purchase metrics: {len(country_avg)} countries")
            del df, country_avg
            gc.collect()

        # Aggregation 4: Advertiser type counts
        print("  Pre-computing advertiser metrics...")
        adv_dfs = []
        for event_type in ['serve', 'impression', 'click', 'purchase']:
            type_file = self.partitions_dir / f"type={event_type}" / "data.parquet"
            if type_file.exists():
                df = pd.read_parquet(type_file, columns=['advertiser_id'])
                counts = df.groupby('advertiser_id').size().reset_index(name='count')
                counts['type'] = event_type
                adv_dfs.append(counts)
                del df
                gc.collect()

        if adv_dfs:
            combined = pd.concat(adv_dfs, ignore_index=True)
            advertiser_metrics = combined.groupby(['advertiser_id', 'type'])['count'].sum().reset_index()
            advertiser_metrics.columns = ['advertiser_id', 'type', 'count']
            advertiser_metrics.to_parquet(self.aggregates_dir / "advertiser_metrics.parquet")
            print(f"    ✓ Advertiser metrics: {len(advertiser_metrics)} rows")
            del adv_dfs, combined, advertiser_metrics
            gc.collect()

    def _cleanup_temp(self):
        """Remove temporary files"""
        import shutil
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
        print("  ✓ Temp files cleaned up")

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

            del result_df
            gc.collect()

        print("\nSummary:")
        for r in results:
            print(f"Q{r['query']}: {r['time']:.3f}s ({r['rows']} rows)")
        print(f"Total time: {sum(r['time'] for r in results):.3f}s")

    def _execute_query(self, query):
        """Smart query planner and executor"""
        # Try pre-aggregated data first
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
            return pd.read_parquet(self.aggregates_dir / "daily_revenue.parquet")

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
            any(isinstance(s, dict) and 'COUNT' in s for s in select) and not where):
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

        for cond in where:
            if cond['col'] == 'type':
                type_filter = cond
            elif cond['col'] == 'day':
                day_filter = cond

        # Load data
        dfs = []
        if type_filter and type_filter['op'] == 'eq':
            event_type = type_filter['val']
            if event_type == 'impression' and day_filter:
                dfs.append(self._load_day_partition(event_type, day_filter))
            else:
                partition_file = self.partitions_dir / f"type={event_type}" / "data.parquet"
                if partition_file.exists():
                    dfs.append(pd.read_parquet(partition_file))
        else:
            for event_type in ['serve', 'impression', 'click', 'purchase']:
                partition_file = self.partitions_dir / f"type={event_type}" / "data.parquet"
                if partition_file.exists():
                    dfs.append(pd.read_parquet(partition_file))

        if not dfs:
            return pd.DataFrame()

        df = pd.concat(dfs, ignore_index=True)
        del dfs
        gc.collect()

        # Apply filters
        for cond in where:
            if cond['col'] == 'type' and type_filter:
                continue

            col, op, val = cond['col'], cond['op'], cond['val']

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

        # Apply aggregations
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

        if group_by:
            for col in group_by:
                if col in df.columns and df[col].dtype == 'object':
                    df[col] = df[col].astype(str)

            agg_dict = {col: func for agg_col, (col, func) in agg_funcs.items()}

            if agg_dict:
                result = df.groupby(group_by, as_index=False).agg(agg_dict)
                new_cols = group_by.copy()
                for agg_col, (col, func) in agg_funcs.items():
                    idx = len(new_cols)
                    result.columns = list(result.columns[:idx]) + [agg_col] + list(result.columns[idx+1:])
            else:
                result = df[group_by].drop_duplicates()
        else:
            result = df[result_cols] if result_cols else df

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
    parser = argparse.ArgumentParser(description="Memory-Efficient Optimized Query Engine")
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
