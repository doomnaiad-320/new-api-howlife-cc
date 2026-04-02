package model

import (
	"errors"
	"fmt"
	"net/mail"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	InvoiceStatusPending  = "pending"
	InvoiceStatusApproved = "approved"
	InvoiceStatusRejected = "rejected"
)

type InvoiceRequest struct {
	Id           int     `json:"id"`
	UserId       int     `json:"user_id" gorm:"index;not null"`
	Amount       float64 `json:"amount" gorm:"type:decimal(12,2);not null;default:0"`
	InvoiceTitle string  `json:"invoice_title" gorm:"type:varchar(255);not null"`
	TaxNumber    string  `json:"tax_number" gorm:"type:varchar(128);not null;default:''"`
	Email        string  `json:"email" gorm:"type:varchar(255);not null"`
	Remark       string  `json:"remark" gorm:"type:text"`
	Status       string  `json:"status" gorm:"type:varchar(32);index;not null;default:'pending'"`
	RejectReason string  `json:"reject_reason" gorm:"type:text"`
	ProcessedBy  int     `json:"processed_by" gorm:"index;default:0"`
	ProcessedAt  int64   `json:"processed_at" gorm:"bigint;index"`
	CreatedAt    int64   `json:"created_at" gorm:"bigint;index"`
	UpdatedAt    int64   `json:"updated_at" gorm:"bigint"`
}

type InvoiceRequestWithUser struct {
	InvoiceRequest
	Username            string `json:"username"`
	ProcessedByUsername string `json:"processed_by_username"`
}

type InvoiceSummary struct {
	EligibleAmount  float64 `json:"eligible_amount"`
	ReservedAmount  float64 `json:"reserved_amount"`
	AvailableAmount float64 `json:"available_amount"`
	PendingCount    int64   `json:"pending_count"`
	ApprovedCount   int64   `json:"approved_count"`
	RejectedCount   int64   `json:"rejected_count"`
	TotalCount      int64   `json:"total_count"`
}

func (InvoiceRequest) TableName() string {
	return "invoice_requests"
}

func (r *InvoiceRequest) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	r.CreatedAt = now
	r.UpdatedAt = now
	if strings.TrimSpace(r.Status) == "" {
		r.Status = InvoiceStatusPending
	}
	return nil
}

func (r *InvoiceRequest) BeforeUpdate(tx *gorm.DB) error {
	r.UpdatedAt = common.GetTimestamp()
	return nil
}

func IsInvoiceStatusValid(status string) bool {
	switch normalizeInvoiceStatus(status) {
	case InvoiceStatusPending, InvoiceStatusApproved, InvoiceStatusRejected:
		return true
	default:
		return false
	}
}

func normalizeInvoiceStatus(status string) string {
	return strings.ToLower(strings.TrimSpace(status))
}

func normalizeInvoiceAmount(amount float64) (decimal.Decimal, error) {
	d := decimal.NewFromFloat(amount).Round(2)
	if !d.GreaterThan(decimal.Zero) {
		return decimal.Zero, errors.New("开票金额必须大于 0")
	}
	return d, nil
}

func validateInvoiceRequestInput(invoiceTitle, taxNumber, email, remark string) error {
	if strings.TrimSpace(invoiceTitle) == "" {
		return errors.New("发票抬头不能为空")
	}
	if len(invoiceTitle) > 255 {
		return errors.New("发票抬头长度不能超过 255")
	}
	if strings.TrimSpace(taxNumber) == "" {
		return errors.New("税号不能为空")
	}
	if len(taxNumber) > 128 {
		return errors.New("税号长度不能超过 128")
	}
	if strings.TrimSpace(email) == "" {
		return errors.New("邮箱不能为空")
	}
	if len(email) > 255 {
		return errors.New("邮箱长度不能超过 255")
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return errors.New("邮箱格式不正确")
	}
	if len(remark) > 2000 {
		return errors.New("备注长度不能超过 2000")
	}
	return nil
}

func decimalToFloat64(value decimal.Decimal) float64 {
	f, _ := value.Round(2).Float64()
	return f
}

func getUserInvoiceableAmountsTx(tx *gorm.DB, userId int) (eligible, reserved, available decimal.Decimal, err error) {
	var topupSum float64
	if err = tx.Model(&TopUp{}).
		Where("user_id = ? AND status = ?", userId, common.TopUpStatusSuccess).
		Select("COALESCE(SUM(money), 0)").
		Scan(&topupSum).Error; err != nil {
		return
	}

	var reservedSum float64
	if err = tx.Model(&InvoiceRequest{}).
		Where("user_id = ? AND status IN ?", userId, []string{InvoiceStatusPending, InvoiceStatusApproved}).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&reservedSum).Error; err != nil {
		return
	}

	eligible = decimal.NewFromFloat(topupSum).Round(2)
	reserved = decimal.NewFromFloat(reservedSum).Round(2)
	available = eligible.Sub(reserved).Round(2)
	if available.IsNegative() {
		available = decimal.Zero
	}
	return
}

func getUserInvoiceSummaryTx(tx *gorm.DB, userId int) (*InvoiceSummary, error) {
	eligible, reserved, available, err := getUserInvoiceableAmountsTx(tx, userId)
	if err != nil {
		return nil, err
	}

	summary := &InvoiceSummary{
		EligibleAmount:  decimalToFloat64(eligible),
		ReservedAmount:  decimalToFloat64(reserved),
		AvailableAmount: decimalToFloat64(available),
	}

	if err = tx.Model(&InvoiceRequest{}).Where("user_id = ?", userId).Count(&summary.TotalCount).Error; err != nil {
		return nil, err
	}
	if err = tx.Model(&InvoiceRequest{}).Where("user_id = ? AND status = ?", userId, InvoiceStatusPending).Count(&summary.PendingCount).Error; err != nil {
		return nil, err
	}
	if err = tx.Model(&InvoiceRequest{}).Where("user_id = ? AND status = ?", userId, InvoiceStatusApproved).Count(&summary.ApprovedCount).Error; err != nil {
		return nil, err
	}
	if err = tx.Model(&InvoiceRequest{}).Where("user_id = ? AND status = ?", userId, InvoiceStatusRejected).Count(&summary.RejectedCount).Error; err != nil {
		return nil, err
	}

	return summary, nil
}

func GetUserInvoiceSummary(userId int) (*InvoiceSummary, error) {
	return getUserInvoiceSummaryTx(DB, userId)
}

func CreateInvoiceRequest(userId int, amount float64, invoiceTitle, taxNumber, email, remark string) (*InvoiceRequest, *InvoiceSummary, error) {
	amountDecimal, err := normalizeInvoiceAmount(amount)
	if err != nil {
		return nil, nil, err
	}

	invoiceTitle = strings.TrimSpace(invoiceTitle)
	taxNumber = strings.TrimSpace(taxNumber)
	email = strings.TrimSpace(email)
	remark = strings.TrimSpace(remark)

	if err = validateInvoiceRequestInput(invoiceTitle, taxNumber, email, remark); err != nil {
		return nil, nil, err
	}

	var invoice InvoiceRequest
	var summary *InvoiceSummary
	err = DB.Transaction(func(tx *gorm.DB) error {
		var user User
		if lockErr := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Select("id").
			Where("id = ?", userId).
			First(&user).Error; lockErr != nil {
			return lockErr
		}

		_, _, available, calcErr := getUserInvoiceableAmountsTx(tx, userId)
		if calcErr != nil {
			return calcErr
		}
		if amountDecimal.GreaterThan(available) {
			return fmt.Errorf("可开票金额不足，当前可开票金额为 %.2f", decimalToFloat64(available))
		}

		invoice = InvoiceRequest{
			UserId:       userId,
			Amount:       decimalToFloat64(amountDecimal),
			InvoiceTitle: invoiceTitle,
			TaxNumber:    taxNumber,
			Email:        email,
			Remark:       remark,
			Status:       InvoiceStatusPending,
		}
		if createErr := tx.Create(&invoice).Error; createErr != nil {
			return createErr
		}

		summary, calcErr = getUserInvoiceSummaryTx(tx, userId)
		return calcErr
	})
	if err != nil {
		return nil, nil, err
	}

	RecordLog(userId, LogTypeSystem, fmt.Sprintf("提交开票申请，金额 %.2f，抬头：%s", invoice.Amount, invoice.InvoiceTitle))
	return &invoice, summary, nil
}

func GetUserInvoiceRequests(userId int, pageInfo *common.PageInfo, status string) (items []*InvoiceRequest, total int64, err error) {
	status = normalizeInvoiceStatus(status)
	query := DB.Model(&InvoiceRequest{}).Where("user_id = ?", userId)
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err = query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err = query.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func GetAllInvoiceRequests(pageInfo *common.PageInfo, keyword, status string) (items []*InvoiceRequestWithUser, total int64, err error) {
	keyword = strings.TrimSpace(strings.ToLower(keyword))
	status = normalizeInvoiceStatus(status)

	countQuery := DB.Table("invoice_requests AS ir").Joins("LEFT JOIN users AS u ON u.id = ir.user_id")
	dataQuery := DB.Table("invoice_requests AS ir").
		Select("ir.*, u.username AS username, p.username AS processed_by_username").
		Joins("LEFT JOIN users AS u ON u.id = ir.user_id").
		Joins("LEFT JOIN users AS p ON p.id = ir.processed_by")

	if keyword != "" {
		like := "%" + keyword + "%"
		condition := "LOWER(u.username) LIKE ? OR LOWER(ir.invoice_title) LIKE ? OR LOWER(ir.tax_number) LIKE ? OR LOWER(ir.email) LIKE ?"
		countQuery = countQuery.Where(condition, like, like, like, like)
		dataQuery = dataQuery.Where(condition, like, like, like, like)
	}
	if status != "" {
		countQuery = countQuery.Where("ir.status = ?", status)
		dataQuery = dataQuery.Where("ir.status = ?", status)
	}

	if err = countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err = dataQuery.Order("ir.id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Scan(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func getInvoiceRequestWithUserByIDTx(tx *gorm.DB, id int) (*InvoiceRequestWithUser, error) {
	var item InvoiceRequestWithUser
	err := tx.Table("invoice_requests AS ir").
		Select("ir.*, u.username AS username, p.username AS processed_by_username").
		Joins("LEFT JOIN users AS u ON u.id = ir.user_id").
		Joins("LEFT JOIN users AS p ON p.id = ir.processed_by").
		Where("ir.id = ?", id).
		Scan(&item).Error
	if err != nil {
		return nil, err
	}
	if item.Id == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &item, nil
}

func UpdateInvoiceRequestStatus(id int, status, rejectReason string, processedBy int) (*InvoiceRequestWithUser, error) {
	status = normalizeInvoiceStatus(status)
	rejectReason = strings.TrimSpace(rejectReason)

	if status != InvoiceStatusApproved && status != InvoiceStatusRejected {
		return nil, errors.New("仅支持更新为已开票或已拒绝")
	}
	if status == InvoiceStatusRejected && rejectReason == "" {
		return nil, errors.New("拒绝原因不能为空")
	}

	var invoice InvoiceRequest
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", id).First(&invoice).Error; err != nil {
			return err
		}
		if normalizeInvoiceStatus(invoice.Status) != InvoiceStatusPending {
			return errors.New("仅支持处理状态为待开票的申请")
		}

		invoice.Status = status
		invoice.RejectReason = ""
		if status == InvoiceStatusRejected {
			invoice.RejectReason = rejectReason
		}
		invoice.ProcessedBy = processedBy
		invoice.ProcessedAt = common.GetTimestamp()

		return tx.Save(&invoice).Error
	})
	if err != nil {
		return nil, err
	}

	var logContent string
	switch status {
	case InvoiceStatusApproved:
		logContent = fmt.Sprintf("开票申请 #%d 已处理为已开票，金额 %.2f", invoice.Id, invoice.Amount)
	case InvoiceStatusRejected:
		logContent = fmt.Sprintf("开票申请 #%d 已被拒绝，原因：%s", invoice.Id, rejectReason)
	}
	if logContent != "" {
		RecordLog(invoice.UserId, LogTypeManage, logContent)
	}

	return getInvoiceRequestWithUserByIDTx(DB, id)
}
