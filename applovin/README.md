# Applovin Challange - Query Optimizer

Ultra-fast CSV analytics engine with columnar storage, intelligent pre-aggregation, and query optimization.

## What did we do?

**DuckDB Performance Tuning:**
- Base on: https://duckdb.org/docs/stable/guides/performance/how_to_tune_workloads
- Columnar storage with Snappy compression for I/O optimization

- Out-of-core processing with disk spillover protection
<!-- - ThreadPoolExecutor for parallel index creation -->
- Tune settings:
    - preserve_insertion_order
    - threads count
    - temp_directory
    - auto-compression

**Indexes:**
- Created We created a similar  B-tree indexes (ART - Adaptive Radix Trees) on type/day/country in parallel via ThreadPoolExecutor.

**Why ART?**
    - ART is faster the B-tree for strings: Type, country codes, dates are often strings/text
    - structure that adapts node sizes based on data density


**Smart Pre-aggregation tables:**
- Daily impression revenue rollups
- Publisher × country × day metrics
- Country purchase averages
- Advertiser performance by geography
- Daily conversion funnel metrics
- Weekly advertiser spend trends
- Hourly traffic patterns

paired with intelligent routing that auto-detects when to use pre-aggregates vs. raw data.


**Intelligent Query Routing:**
- Auto-detects when to use pre-aggregates vs raw data
- Sub-linear scaling with dimensional reduction
- Query plan rewriting via semantic pattern matching

## 🏃‍♂️ Quick Start

```bash
# Use venv
python3 -m venv .venv

# Mac/Linux only!
source .venv/bin/activate

# Install dependencies
pip3 install -r requirements.txt

# Run benchmark for lite db
python3 optimized.py --data-dir ./data/data-lite --storage-dir ./storage --out-dir ./results --bench

# Full DB

# Benchmark mode: runs baseline → optimized → comparison
python3 optimized.py --data-dir ./data/data --storage-dir ./storage --out-dir ./results-full --bench

# Or run phases separately:
python3 optimized.py --data-dir ./data/data --storage-dir ./storage --out-dir ./results-full --prepare  # Load & optimize data
python3 optimized.py --data-dir ./data/data --storage-dir ./storage --out-dir ./results-full --run       # Execute queries

# Baseline comparison
python3 main.py --data-dir ./data --out-dir ./baseline_results

# Run with hardware monitor

pip3 install matplotlib

<command> & echo $! | xargs python3 montior.py

example: python3 main.py --data-dir ./data --out-dir ./baseline_results & echo $! | xargs python3 montior.py
```

## 📊 Performance
Machine used: MacBook Air M3 (24gb)

### lite dataset
```
# Baseline data:

Summary:
Q1: 0.814s (365 rows)
Q2: 0.673s (826 rows)
Q3: 0.588s (12 rows)
Q4: 0.650s (3713 rows)
Q5: 0.801s (1440 rows)
Total time: 3.526s

# Optimized script:

Prepare time: 19.2s

Query 1: 365 rows in 160.7ms
Query 2: 826 rows in 2.6ms
Query 3: 12 rows in 1.3ms
Query 4: 3,713 rows in 2.1ms
Query 5: 1,440 rows in 1.4ms

ALL QUERIES COMPLETE in 168.0ms
```

Monitor graphs
![insert image](https://github.com/satvikprasad/i-imo/blob/master/applovin/resource_usage-lite.png?raw=true)

### full dataset

```
# Baseline:

Summary:
Q1: 15.740s (366 rows)
Q2: 13.653s (1114 rows)
Q3: 12.890s (12 rows)
Q4: 14.738s (6616 rows)
Q5: 17.515s (1440 rows)
Total time: 74.534s

# Optimized script:

Prepare time: 409.9s (6m 49s)

Query 1: 366 rows in 349.9ms
Query 2: 1,114 rows in 22.7ms
Query 3: 12 rows in 1.9ms
Query 4: 6,616 rows in 2.8ms
Query 5: 1,440 rows in 4.6ms

ALL QUERIES COMPLETE in 381.8ms


```

Graphs
![insert image](https://github.com/satvikprasad/i-imo/blob/master/applovin/resource_usage.png?raw=true)

## 🏗️ Architecture

1. **Load Phase**: CSV → DuckDB columnar format with transformations
2. **Index Phase**: Parallel ART index creation on key dimensions
3. **Aggregate Phase**: Build 9 strategic rollup tables
4. **Query Phase**: Route queries to optimal pre-aggregates or raw data
5. **Cache Phase**: Store results for instant repeated queries
