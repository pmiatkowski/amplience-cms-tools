import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

type CoverageMetric = {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
};

type CoverageSummary = {
  total: {
    lines: CoverageMetric;
    statements: CoverageMetric;
    functions: CoverageMetric;
    branches: CoverageMetric;
  };
  [key: string]: unknown;
};

type CoverageReport = {
  timestamp: string;
  totalCoverage: {
    lines: number;
    statements: number;
    functions: number;
    branches: number;
  };
  filesAnalyzed: number;
  thresholdsMet: boolean;
  files: Array<{
    path: string;
    lines: number;
    statements: number;
    functions: number;
    branches: number;
  }>;
};

const COVERAGE_DIR = join(process.cwd(), 'coverage');
const SUMMARY_FILE = join(COVERAGE_DIR, 'coverage-summary.json');
const REPORT_DIR = join(process.cwd(), 'reports');
const OUTPUT_FILE = join(REPORT_DIR, `coverage-report-${Date.now()}.json`);

const THRESHOLDS = {
  lines: 80,
  statements: 80,
  functions: 80,
  branches: 80,
};

function processCoverage(): void {
  console.log('🔍 Processing coverage report...\n');

  // Check if coverage summary exists
  if (!existsSync(SUMMARY_FILE)) {
    console.error('❌ Coverage summary not found. Run "npm run test:coverage" first.');
    process.exit(1);
  }

  // Read coverage summary
  const coverageData: CoverageSummary = JSON.parse(readFileSync(SUMMARY_FILE, 'utf-8'));

  const { total } = coverageData;

  // Extract file-level coverage
  const files = Object.entries(coverageData)
    .filter(([key]) => key !== 'total')
    .map(([path, data]: [string, unknown]) => {
      const fileData = data as {
        lines: CoverageMetric;
        statements: CoverageMetric;
        functions: CoverageMetric;
        branches: CoverageMetric;
      };

      return {
        path,
        lines: fileData.lines.pct,
        statements: fileData.statements.pct,
        functions: fileData.functions.pct,
        branches: fileData.branches.pct,
      };
    })
    .sort((a, b) => a.lines - b.lines); // Sort by lines coverage (lowest first)

  // Create report
  const report: CoverageReport = {
    timestamp: new Date().toISOString(),
    totalCoverage: {
      lines: total.lines.pct,
      statements: total.statements.pct,
      functions: total.functions.pct,
      branches: total.branches.pct,
    },
    filesAnalyzed: files.length,
    thresholdsMet:
      total.lines.pct >= THRESHOLDS.lines &&
      total.statements.pct >= THRESHOLDS.statements &&
      total.functions.pct >= THRESHOLDS.functions &&
      total.branches.pct >= THRESHOLDS.branches,
    files,
  };

  // Print summary to console
  console.log('📊 Coverage Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Lines:      ${formatCoverage(total.lines.pct, THRESHOLDS.lines)}`);
  console.log(`Statements: ${formatCoverage(total.statements.pct, THRESHOLDS.statements)}`);
  console.log(`Functions:  ${formatCoverage(total.functions.pct, THRESHOLDS.functions)}`);
  console.log(`Branches:   ${formatCoverage(total.branches.pct, THRESHOLDS.branches)}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📁 Files analyzed: ${files.length}\n`);

  // Show files with low coverage
  const lowCoverageFiles = files.filter(file => file.lines < THRESHOLDS.lines);
  if (lowCoverageFiles.length > 0) {
    console.log(`⚠️  Files below threshold (${THRESHOLDS.lines}%):`);
    lowCoverageFiles.slice(0, 10).forEach(file => {
      console.log(`  - ${file.path}: ${file.lines.toFixed(2)}%`);
    });
    if (lowCoverageFiles.length > 10) {
      console.log(`  ... and ${lowCoverageFiles.length - 10} more`);
    }
    console.log();
  }

  // Save detailed report
  if (!existsSync(REPORT_DIR)) {
    console.log('📁 Creating reports directory...');
    mkdirSync(REPORT_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`✅ Detailed report saved to: ${OUTPUT_FILE}\n`);

  // Exit with appropriate code

  if (!report.thresholdsMet) {
    console.error('❌ Coverage thresholds not met!');
    process.exit(1);
  } else {
    console.log('✅ All coverage thresholds met!');
    process.exit(0);
  }
}

function formatCoverage(value: number, threshold: number): string {
  const formatted = value.toFixed(2).padStart(6);
  const status = value >= threshold ? '✅' : '❌';
  const color = value >= threshold ? '\x1b[32m' : '\x1b[31m'; // Green or Red
  const reset = '\x1b[0m';

  return `${color}${formatted}%${reset} ${status}`;
}

// Run the script
try {
  processCoverage();
} catch (error) {
  console.error('❌ Error processing coverage:', error);
  process.exit(1);
}
