package controller

import (
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type CreateInvoiceRequest struct {
	Amount       float64 `json:"amount"`
	InvoiceTitle string  `json:"invoice_title"`
	TaxNumber    string  `json:"tax_number"`
	Email        string  `json:"email"`
	Remark       string  `json:"remark"`
}

type UpdateInvoiceStatusRequest struct {
	Status       string `json:"status"`
	RejectReason string `json:"reject_reason"`
}

func GetInvoiceSummary(c *gin.Context) {
	userId := c.GetInt("id")
	summary, err := model.GetUserInvoiceSummary(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, summary)
}

func GetUserInvoices(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	status := strings.TrimSpace(c.Query("status"))
	if status != "" && !model.IsInvoiceStatusValid(status) {
		common.ApiErrorMsg(c, "无效的状态筛选")
		return
	}

	items, total, err := model.GetUserInvoiceRequests(userId, pageInfo, status)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func CreateInvoice(c *gin.Context) {
	userId := c.GetInt("id")
	var req CreateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	invoice, summary, err := model.CreateInvoiceRequest(
		userId,
		req.Amount,
		req.InvoiceTitle,
		req.TaxNumber,
		req.Email,
		req.Remark,
	)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"invoice": invoice,
		"summary": summary,
	})
}

func GetAllInvoices(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	keyword := strings.TrimSpace(c.Query("keyword"))
	status := strings.TrimSpace(c.Query("status"))
	if status != "" && !model.IsInvoiceStatusValid(status) {
		common.ApiErrorMsg(c, "无效的状态筛选")
		return
	}

	items, total, err := model.GetAllInvoiceRequests(pageInfo, keyword, status)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func UpdateInvoiceStatus(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if id <= 0 {
		common.ApiErrorMsg(c, "无效的开票申请 ID")
		return
	}

	var req UpdateInvoiceStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	item, err := model.UpdateInvoiceRequestStatus(id, req.Status, req.RejectReason, c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, item)
}
