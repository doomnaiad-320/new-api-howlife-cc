package model

import (
	"path/filepath"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestMigrateDBSQLiteWithLegacyInvoiceRequestTable(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "legacy.db")

	common.SQLitePath = dbPath + "?_busy_timeout=30000"
	common.UsingSQLite = true
	common.UsingMySQL = false
	common.UsingPostgreSQL = false

	db, err := gorm.Open(sqlite.Open(common.SQLitePath), &gorm.Config{
		PrepareStmt: true,
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	DB = db

	legacyTableSQL := "CREATE TABLE `invoice_requests` (`id` integer,`user_id` integer NOT NULL,`amount` decimal(12,2) NOT NULL DEFAULT 0.000000,`invoice_title` varchar(255) NOT NULL,`tax_number` varchar(128) NOT NULL DEFAULT \"\",`email` varchar(255) NOT NULL,`remark` text,`status` varchar(32) NOT NULL DEFAULT \"pending\",`reject_reason` text,`processed_by` integer DEFAULT 0,`processed_at` integer,`created_at` integer,`updated_at` integer,PRIMARY KEY (`id`))"
	if err := DB.Exec(legacyTableSQL).Error; err != nil {
		t.Fatalf("create legacy invoice_requests: %v", err)
	}

	if err := migrateDB(); err != nil {
		t.Fatalf("migrateDB with legacy invoice_requests should succeed: %v", err)
	}

	if !DB.Migrator().HasTable("invoice_requests") {
		t.Fatal("invoice_requests table should still exist after migration")
	}

	var indexCount int64
	if err := DB.Raw("SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND tbl_name = 'invoice_requests'").Scan(&indexCount).Error; err != nil {
		t.Fatalf("count invoice_requests indexes: %v", err)
	}
	if indexCount < 5 {
		t.Fatalf("expected invoice_requests indexes to be created, got %d", indexCount)
	}
}
