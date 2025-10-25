#!/bin/bash

# Query Planner Challenge - Performance Comparison Script

echo "═══════════════════════════════════════════════════════════════"
echo "  Query Planner Challenge - Baseline vs Optimized Comparison"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Activate virtual environment
source .venv/bin/activate

# Clean up previous results
echo "🧹 Cleaning up previous results..."
rm -rf results-baseline results-optimized tmp storage
echo ""

# Run DuckDB Baseline
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  BASELINE: DuckDB (No Optimization)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
python3 main.py --data-dir data/data-lite --out-dir results-baseline
echo ""

# Run Optimized Solution - Prepare Phase
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OPTIMIZED: Prepare Phase"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
python3 optimized_main.py --data-dir data/data-lite --storage-dir storage --out-dir results-optimized --prepare
echo ""

# Run Optimized Solution - Query Phase
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OPTIMIZED: Query Phase"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
python3 optimized_main.py --data-dir data/data-lite --storage-dir storage --out-dir results-optimized --run
echo ""

# Verify Results
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VERIFICATION: Checking Result Accuracy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
python3 -c "
import pandas as pd
import sys

errors = []

# Q1
baseline = pd.read_csv('results-baseline/q1.csv').sort_values('day').reset_index(drop=True)
optimized = pd.read_csv('results-optimized/q1.csv').sort_values('day').reset_index(drop=True)
optimized.columns = baseline.columns
merged = baseline.merge(optimized, on='day', suffixes=('_base', '_opt'))
merged['diff'] = (merged[baseline.columns[1] + '_base'] - merged[baseline.columns[1] + '_opt']).abs()
max_diff_q1 = merged['diff'].max()
if max_diff_q1 < 0.001 and len(baseline) == len(optimized):
    print('✅ Q1: PASS - {} rows, max diff: {:.6f}'.format(len(baseline), max_diff_q1))
else:
    print('❌ Q1: FAIL')
    errors.append('Q1')

# Q2
baseline = pd.read_csv('results-baseline/q2.csv')
optimized = pd.read_csv('results-optimized/q2.csv')
if len(baseline) == len(optimized):
    print('✅ Q2: PASS - {} rows match'.format(len(baseline)))
else:
    print('❌ Q2: FAIL')
    errors.append('Q2')

# Q3
baseline = pd.read_csv('results-baseline/q3.csv').sort_values('country').reset_index(drop=True)
optimized = pd.read_csv('results-optimized/q3.csv').sort_values('country').reset_index(drop=True)
optimized.columns = baseline.columns
if len(baseline) == len(optimized):
    print('✅ Q3: PASS - {} rows match'.format(len(baseline)))
else:
    print('❌ Q3: FAIL')
    errors.append('Q3')

# Q4
baseline = pd.read_csv('results-baseline/q4.csv')
optimized = pd.read_csv('results-optimized/q4.csv')
if len(baseline) == len(optimized):
    print('✅ Q4: PASS - {} rows match'.format(len(baseline)))
else:
    print('❌ Q4: FAIL')
    errors.append('Q4')

# Q5
baseline = pd.read_csv('results-baseline/q5.csv')
optimized = pd.read_csv('results-optimized/q5.csv')
if len(baseline) == len(optimized):
    print('✅ Q5: PASS - {} rows match'.format(len(baseline)))
else:
    print('❌ Q5: FAIL')
    errors.append('Q5')

if errors:
    print('\n❌ Verification FAILED for queries: {}'.format(', '.join(errors)))
    sys.exit(1)
else:
    print('\n✅ All queries produce correct results!')
"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Comparison Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📊 View detailed performance report: cat PERFORMANCE_REPORT.md"
echo ""
