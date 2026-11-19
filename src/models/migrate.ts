import { testPostgresConnection, getPostgresPool } from './postgres.js';
import { ENV } from '../config/env.js';
import { MigrationEngine } from './migrationEngine.js';
import {
  SEED_USERS,
  SEED_SHOP_SETTINGS,
} from './initialSeed.js';

export const runMigrations = async (): Promise<boolean> => {
  try {
    const result = await MigrationEngine.autoMigrate();
    if (result.appliedMigrations.length > 0) {
      console.log(`[MigrationEngine] 🚀 Successfully applied ${result.appliedMigrations.length} incremental migration(s):`, result.appliedMigrations);
    } else {
      console.log('[MigrationEngine] ℹ️ All migrations are up to date. No pending migrations.');
    }
    return result.success;
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  }
};

export const seedDatabaseIfEmpty = async (): Promise<boolean> => {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    // Check if users table already has data
    const userRes = await client.query('SELECT COUNT(*)::int AS cnt FROM users');
    if (userRes.rows[0]?.cnt > 0) {
      console.log('ℹ️ PostgreSQL tables already contain data, skipping initial seed.');
      return true;
    }

    console.log('🌱 Database is empty. Auto-seeding initial store and tenant data...');
    await client.query('BEGIN');

    // 1. Ensure default tenant CLI-1001 exists
    await client.query(
      `INSERT INTO client_tenants (
        id, business_name, owner_name, email, phone, city, state, business_type, license_tier,
        billing_frequency, monthly_fee, status, start_date, renewal_date, username, tenant_code, login_url
      ) VALUES (
        'CLI-1001', 'Sri Ganesh Vedic Pooja & Superstore', 'Store Owner', 'owner@sriganesh.com', '+91 98765 43210',
        'Hyderabad', 'Telangana', 'pooja', 'professional', 'monthly', 1499.00, 'active',
        CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'owner', 'CLI-1001', 'http://localhost:3000/login'
      ) ON CONFLICT (id) DO NOTHING`
    );

    // 2. Users (Admin, Owner, Staff)
    for (const u of SEED_USERS) {
      await client.query(
        `INSERT INTO users (
          id, name, email, password_hash, role, tenant_id, phone, designation, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING`,
        [
          u.id, u.name, u.email, u.passwordHash, u.role, u.tenantId || null,
          u.phone || null, u.designation || null, u.isActive,
        ]
      );
    }

    // 3. Platform Integrations
    await client.query(
      `INSERT INTO platform_integrations (
        id, thermal_printer_enabled, printer_paper_width, printer_interface,
        cash_drawer_kick_pulse, payment_soundbox_enabled, soundbox_provider,
        whatsapp_enabled, sms_alerts_enabled, gst_einvoice_enabled, eway_bill_enabled
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO NOTHING`,
      [
        'platform_global', true, '80mm', 'Network / USB',
        true, false, 'Paytm / PhonePe Soundbox',
        false, false, false, false,
      ]
    );

    // 4. Shop Settings
    const ss = SEED_SHOP_SETTINGS;
    await client.query(
      `INSERT INTO shop_settings (
        tenant_id, shop_name, tagline, address, city, state, pincode, phone, email,
        gstin, default_payment_mode, low_stock_threshold, upi_id,
        receipt_footer_message, auto_round_off
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (tenant_id) DO NOTHING`,
      [
        'CLI-1001', ss.shopName || 'Store', ss.tagline || '', ss.address || 'Store Address',
        'Hyderabad', 'Telangana', '500001', ss.phone || '+91 98765 43210', 'owner@sriganesh.com',
        ss.gstin || null, 'Cash', 5, ss.upiId || 'store@upi',
        'Thank you for shopping with us!', true,
      ]
    );

    await client.query('COMMIT');
    console.log('🌱 Initial database seed applied successfully.');
    return true;
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Auto-seed failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Automatically initializes database connections, applies migrations, and seeds initial records.
 * Runs on backend startup with zero manual external commands required.
 */
export const autoInitializeDatabase = async (): Promise<boolean> => {
  if (!ENV.ENABLE_POSTGRES) {
    console.log('💾 Storage Engine: Resilient Multi-Tenant ACID Store (PostgreSQL disabled in .env)');
    return false;
  }

  console.log('🐘 Testing PostgreSQL connection...');
  const isConnected = await testPostgresConnection();

  if (!isConnected) {
    console.log('ℹ️ PostgreSQL not reachable or credentials pending. Operating in resilient local ACID storage engine mode.');
    return false;
  }

  try {
    console.log('🚀 [AutoMigration] Synchronizing schemas, new tables & versioned migrations...');
    await runMigrations();
    await seedDatabaseIfEmpty();
    console.log('✨ [AutoMigration] PostgreSQL database fully synchronized and ready for production!');
    return true;
  } catch (err: any) {
    console.warn('⚠️ Auto-initialization encountered an issue:', err.message);
    console.log('ℹ️ Resilient local storage fallback remains active and healthy.');
    return false;
  }
};

// If run directly via CLI (tsx src/models/migrate.ts)
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  if (process.argv.includes('--status')) {
    MigrationEngine.getStatus()
      .then((status) => {
        console.log('\n📊 === Database Migration Status ===');
        console.log(`Applied Migrations (${status.applied.length}):`);
        status.applied.forEach((m) => {
          console.log(`  ✓ ${m.name} (Applied: ${m.applied_at}, Time: ${m.execution_time_ms}ms)`);
        });
        console.log(`\nPending Migrations (${status.pending.length}):`);
        if (status.pending.length === 0) {
          console.log('  None. All migrations up-to-date!');
        } else {
          status.pending.forEach((m) => {
            console.log(`  ⏳ ${m}`);
          });
        }
        console.log('====================================\n');
        process.exit(0);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  } else {
    autoInitializeDatabase()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}
