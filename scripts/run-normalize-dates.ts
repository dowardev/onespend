import 'source-map-support/register';
import { migrateNormalizeBackupDates } from '../src/migrations/normalizeBackupsDates';

type Options = {
  dryRun?: boolean;
  verbose?: boolean;
};

async function main() {
  const args = process.argv.slice(2);
  const opts: Options = { dryRun: true, verbose: true };
  for (const a of args) {
    if (a === '--apply' || a === '-a') opts.dryRun = false;
    if (a === '--quiet' || a === '-q') opts.verbose = false;
    if (a === '--help' || a === '-h') {
      console.log(
        'Usage: ts-node scripts/run-normalize-dates.ts [--apply] [--quiet]'
      );
      process.exit(0);
    }
  }

  console.log(
    `Running normalizeBackupsDates migration (dryRun=${opts.dryRun})`
  );
  try {
    const res = await migrateNormalizeBackupDates({
      dryRun: !!opts.dryRun,
      verbose: !!opts.verbose,
    });
    console.log('Migration result:');
    console.log(JSON.stringify(res, null, 2));
    if (opts.dryRun) {
      console.log('\nDry run complete. To apply changes run with --apply');
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(2);
  }
}

main();
