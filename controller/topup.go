package controller

import (
	"fmt"
	"log"
	"net/url"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/Calcium-Ion/go-epay/epay"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
)

func GetTopUpInfo(c *gin.Context) {
	// 获取支付方式
	payMethods := operation_setting.PayMethods

	// 如果启用了 Stripe 支付，添加到支付方法列表
	if setting.StripeApiSecret != "" && setting.StripeWebhookSecret != "" && setting.StripePriceId != "" {
		// 检查是否已经包含 Stripe
		hasStripe := false
		for _, method := range payMethods {
			if method["type"] == "stripe" {
				hasStripe = true
				break
			}
		}

		if !hasStripe {
			stripeMethod := map[string]string{
				"name":      "Stripe",
				"type":      "stripe",
				"color":     "rgba(var(--semi-purple-5), 1)",
				"min_topup": strconv.Itoa(setting.StripeMinTopUp),
			}
			payMethods = append(payMethods, stripeMethod)
		}
	}

	// 获取返利配置
	quotaSetting := operation_setting.GetQuotaSetting()

	// 获取当前用户的充值次数
	userId := c.GetInt("id")
	userTopupCount := 0
	if userId > 0 {
		user, err := model.GetUserById(userId, false)
		if err == nil && user != nil {
			userTopupCount = user.TopupCount
		}
	}

	data := gin.H{
		"enable_online_topup":    operation_setting.PayAddress != "" && operation_setting.EpayId != "" && operation_setting.EpayKey != "",
		"enable_stripe_topup":    setting.StripeApiSecret != "" && setting.StripeWebhookSecret != "" && setting.StripePriceId != "",
		"enable_creem_topup":     setting.CreemApiKey != "" && setting.CreemProducts != "[]",
		"creem_products":         setting.CreemProducts,
		"pay_methods":            payMethods,
		"min_topup":              operation_setting.MinTopUp,
		"stripe_min_topup":       setting.StripeMinTopUp,
		"amount_options":         operation_setting.GetPaymentSetting().AmountOptions,
		"discount":               operation_setting.GetPaymentSetting().AmountDiscount,
		"topup_rebate_percent":   quotaSetting.TopupRebatePercent,
		"topup_rebate_max_count": quotaSetting.TopupRebateMaxCount,
		"user_topup_count":       userTopupCount,
	}
	common.ApiSuccess(c, data)
}

type EpayRequest struct {
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
	TopUpCode     string `json:"top_up_code"`
	PromoCode     string `json:"promo_code"`
}

type AmountRequest struct {
	Amount    int64  `json:"amount"`
	TopUpCode string `json:"top_up_code"`
	PromoCode string `json:"promo_code"`
}

func GetEpayClient() *epay.Client {
	if operation_setting.PayAddress == "" || operation_setting.EpayId == "" || operation_setting.EpayKey == "" {
		return nil
	}
	withUrl, err := epay.NewClient(&epay.Config{
		PartnerID: operation_setting.EpayId,
		Key:       operation_setting.EpayKey,
	}, operation_setting.PayAddress)
	if err != nil {
		return nil
	}
	return withUrl
}

func getPayMoney(amount int64, group string, promoDiscount float64) float64 {
	dAmount := decimal.NewFromInt(amount)
	// 充值金额以"展示类型"为准：
	// - USD/CNY: 前端传 amount 为金额单位；TOKENS: 前端传 tokens，需要换成 USD 金额
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		dAmount = dAmount.Div(dQuotaPerUnit)
	}

	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}

	dTopupGroupRatio := decimal.NewFromFloat(topupGroupRatio)
	dPrice := decimal.NewFromFloat(operation_setting.Price)
	// apply optional preset discount by the original request amount (if configured), default 1.0
	discount := 1.0
	if ds, ok := operation_setting.GetPaymentSetting().AmountDiscount[int(amount)]; ok {
		if ds > 0 {
			discount = ds
		}
	}
	dDiscount := decimal.NewFromFloat(discount)

	// 应用优惠码折扣 (promoDiscount 为 0-1 之间的值，例如 0.9 表示 9 折)
	dPromoDiscount := decimal.NewFromFloat(promoDiscount)

	payMoney := dAmount.Mul(dPrice).Mul(dTopupGroupRatio).Mul(dDiscount).Mul(dPromoDiscount)

	return payMoney.InexactFloat64()
}

// validatePromoCode 验证优惠码并返回优惠码所属用户ID和折扣
// 返回: promoUserId (0表示无效或未使用), promoDiscount (1.0表示无折扣)
func validatePromoCode(promoCode string, currentUserId int) (int, float64) {
	common.SysLog(fmt.Sprintf("validatePromoCode: promoCode=%s, currentUserId=%d", promoCode, currentUserId))

	if promoCode == "" {
		common.SysLog("validatePromoCode: promoCode is empty")
		return 0, 1.0
	}

	// 查询优惠码对应的用户
	promoUserId, err := model.GetUserIdByAffCode(promoCode)
	common.SysLog(fmt.Sprintf("validatePromoCode: promoUserId=%d, err=%v", promoUserId, err))
	if err != nil || promoUserId == 0 {
		common.SysLog("validatePromoCode: invalid promo code")
		return 0, 1.0
	}

	// 不能使用自己的优惠码
	if promoUserId == currentUserId {
		common.SysLog("validatePromoCode: cannot use own promo code")
		return 0, 1.0
	}

	// 获取返利配置
	quotaSetting := operation_setting.GetQuotaSetting()
	rebatePercent := quotaSetting.TopupRebatePercent
	rebateMaxCount := quotaSetting.TopupRebateMaxCount
	common.SysLog(fmt.Sprintf("validatePromoCode: rebatePercent=%d, rebateMaxCount=%d", rebatePercent, rebateMaxCount))

	if rebatePercent <= 0 || rebateMaxCount <= 0 {
		common.SysLog("validatePromoCode: rebate config is 0")
		return 0, 1.0
	}

	// 检查当前用户的充值次数是否已超过限制
	currentUser, err := model.GetUserById(currentUserId, false)
	if err != nil || currentUser == nil {
		common.SysLog("validatePromoCode: failed to get current user")
		return 0, 1.0
	}
	common.SysLog(fmt.Sprintf("validatePromoCode: currentUser.TopupCount=%d", currentUser.TopupCount))
	if currentUser.TopupCount >= rebateMaxCount {
		// 用户充值次数已达上限，优惠码无效
		common.SysLog("validatePromoCode: user topup count exceeded")
		return 0, 1.0
	}

	// 折扣 = 1 - 返利百分比/100
	// 例如返利10%，则用户享受 90% 的价格（9折）
	promoDiscount := 1.0 - float64(rebatePercent)/100.0
	if promoDiscount < 0.01 {
		promoDiscount = 0.01 // 最低1%
	}

	common.SysLog(fmt.Sprintf("validatePromoCode: SUCCESS promoDiscount=%f", promoDiscount))
	return promoUserId, promoDiscount
}

// parsePromoUserIdFromTradeNo 从订单号中解析优惠码用户ID
// 订单号格式: USR{userId}PROMO{promoUserId}NO{randomStr} 或 USR{userId}NO{randomStr}
func parsePromoUserIdFromTradeNo(tradeNo string) int {
	// 使用正则表达式匹配 PROMO{数字}
	re := regexp.MustCompile(`PROMO(\d+)NO`)
	matches := re.FindStringSubmatch(tradeNo)
	if len(matches) < 2 {
		return 0
	}
	promoUserId, err := strconv.Atoi(matches[1])
	if err != nil {
		return 0
	}
	return promoUserId
}

// processPromoRebate 处理优惠码返利
// promoUserId: 优惠码所有者的用户ID
// quota: 充值获得的额度
func processPromoRebate(promoUserId int, quota int) {
	common.SysLog(fmt.Sprintf("开始处理优惠码返利: promoUserId=%d, quota=%d", promoUserId, quota))

	// 获取返利配置
	quotaSetting := operation_setting.GetQuotaSetting()
	rebatePercent := quotaSetting.TopupRebatePercent

	common.SysLog(fmt.Sprintf("返利配置: rebatePercent=%d", rebatePercent))

	// 如果返利百分比为0，不处理返利
	if rebatePercent <= 0 {
		common.SysLog("返利配置为0，跳过返利")
		return
	}

	// 计算返利额度
	rebateQuota := quota * rebatePercent / 100
	if rebateQuota <= 0 {
		common.SysLog(fmt.Sprintf("返利额度为0，跳过返利: quota=%d, rebatePercent=%d", quota, rebatePercent))
		return
	}

	common.SysLog(fmt.Sprintf("计算返利额度: %d * %d / 100 = %d", quota, rebatePercent, rebateQuota))

	// 给优惠码所有者增加返利额度（aff_quota 和 aff_history_quota）
	err := model.IncreaseUserAffQuota(promoUserId, rebateQuota)
	if err != nil {
		common.SysLog(fmt.Sprintf("优惠码返利失败: %v", err))
		return
	}

	// 记录日志
	promoUserName, _ := model.GetUsernameById(promoUserId, false)
	model.RecordLog(promoUserId, model.LogTypeSystem, fmt.Sprintf("优惠码被使用，获得返利 %s（返利比例%d%%）", logger.LogQuota(rebateQuota), rebatePercent))
	common.SysLog(fmt.Sprintf("优惠码返利成功: 用户 %s 获得返利 %d", promoUserName, rebateQuota))
}

func getMinTopup() int64 {
	minTopup := operation_setting.MinTopUp
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dMinTopup := decimal.NewFromInt(int64(minTopup))
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		minTopup = int(dMinTopup.Mul(dQuotaPerUnit).IntPart())
	}
	return int64(minTopup)
}

func RequestEpay(c *gin.Context) {
	var req EpayRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	if req.Amount < getMinTopup() {
		c.JSON(200, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getMinTopup())})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}

	// 验证优惠码
	promoUserId, promoDiscount := validatePromoCode(req.PromoCode, id)

	payMoney := getPayMoney(req.Amount, group, promoDiscount)
	if payMoney < 0.01 {
		c.JSON(200, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	if !operation_setting.ContainsPayMethod(req.PaymentMethod) {
		c.JSON(200, gin.H{"message": "error", "data": "支付方式不存在"})
		return
	}

	callBackAddress := service.GetCallbackAddress()
	returnUrl, _ := url.Parse(system_setting.ServerAddress + "/console/log")
	notifyUrl, _ := url.Parse(callBackAddress + "/api/user/epay/notify")

	// 生成订单号，编码优惠码用户ID
	// 格式: USR{userId}PROMO{promoUserId}NO{randomStr} 或 USR{userId}NO{randomStr}
	tradeNo := fmt.Sprintf("%s%d", common.GetRandomString(6), time.Now().Unix())
	if promoUserId > 0 {
		tradeNo = fmt.Sprintf("USR%dPROMO%dNO%s", id, promoUserId, tradeNo)
	} else {
		tradeNo = fmt.Sprintf("USR%dNO%s", id, tradeNo)
	}

	client := GetEpayClient()
	if client == nil {
		c.JSON(200, gin.H{"message": "error", "data": "当前管理员未配置支付信息"})
		return
	}
	uri, params, err := client.Purchase(&epay.PurchaseArgs{
		Type:           req.PaymentMethod,
		ServiceTradeNo: tradeNo,
		Name:           fmt.Sprintf("TUC%d", req.Amount),
		Money:          strconv.FormatFloat(payMoney, 'f', 2, 64),
		Device:         epay.PC,
		NotifyUrl:      notifyUrl,
		ReturnUrl:      returnUrl,
	})
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}
	amount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount := decimal.NewFromInt(int64(amount))
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		amount = dAmount.Div(dQuotaPerUnit).IntPart()
	}
	topUp := &model.TopUp{
		UserId:        id,
		Amount:        amount,
		Money:         payMoney,
		TradeNo:       tradeNo,
		PaymentMethod: req.PaymentMethod,
		CreateTime:    time.Now().Unix(),
		Status:        "pending",
	}
	err = topUp.Insert()
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}
	c.JSON(200, gin.H{"message": "success", "data": params, "url": uri})
}

// tradeNo lock
var orderLocks sync.Map
var createLock sync.Mutex

// LockOrder 尝试对给定订单号加锁
func LockOrder(tradeNo string) {
	lock, ok := orderLocks.Load(tradeNo)
	if !ok {
		createLock.Lock()
		defer createLock.Unlock()
		lock, ok = orderLocks.Load(tradeNo)
		if !ok {
			lock = new(sync.Mutex)
			orderLocks.Store(tradeNo, lock)
		}
	}
	lock.(*sync.Mutex).Lock()
}

// UnlockOrder 释放给定订单号的锁
func UnlockOrder(tradeNo string) {
	lock, ok := orderLocks.Load(tradeNo)
	if ok {
		lock.(*sync.Mutex).Unlock()
	}
}

func EpayNotify(c *gin.Context) {
	params := lo.Reduce(lo.Keys(c.Request.URL.Query()), func(r map[string]string, t string, i int) map[string]string {
		r[t] = c.Request.URL.Query().Get(t)
		return r
	}, map[string]string{})
	client := GetEpayClient()
	if client == nil {
		log.Println("易支付回调失败 未找到配置信息")
		_, err := c.Writer.Write([]byte("fail"))
		if err != nil {
			log.Println("易支付回调写入失败")
		}
		return
	}
	verifyInfo, err := client.Verify(params)
	if err == nil && verifyInfo.VerifyStatus {
		_, err := c.Writer.Write([]byte("success"))
		if err != nil {
			log.Println("易支付回调写入失败")
		}
	} else {
		_, err := c.Writer.Write([]byte("fail"))
		if err != nil {
			log.Println("易支付回调写入失败")
		}
		log.Println("易支付回调签名验证失败")
		return
	}

	if verifyInfo.TradeStatus == epay.StatusTradeSuccess {
		log.Println(verifyInfo)
		LockOrder(verifyInfo.ServiceTradeNo)
		defer UnlockOrder(verifyInfo.ServiceTradeNo)
		topUp := model.GetTopUpByTradeNo(verifyInfo.ServiceTradeNo)
		if topUp == nil {
			log.Printf("易支付回调未找到订单: %v", verifyInfo)
			return
		}
		if topUp.Status == "pending" {
			topUp.Status = "success"
			err := topUp.Update()
			if err != nil {
				log.Printf("易支付回调更新订单失败: %v", topUp)
				return
			}
			//user, _ := model.GetUserById(topUp.UserId, false)
			//user.Quota += topUp.Amount * 500000
			dAmount := decimal.NewFromInt(int64(topUp.Amount))
			dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
			quotaToAdd := int(dAmount.Mul(dQuotaPerUnit).IntPart())
			err = model.IncreaseUserQuota(topUp.UserId, quotaToAdd, true)
			if err != nil {
				log.Printf("易支付回调更新用户失败: %v", topUp)
				return
			}
			log.Printf("易支付回调更新用户成功 %v", topUp)
			model.RecordLog(topUp.UserId, model.LogTypeTopup, fmt.Sprintf("使用在线充值成功，充值金额: %v，支付金额：%f", logger.LogQuota(quotaToAdd), topUp.Money))

			// 解析订单号中的优惠码用户ID并处理返利
			promoUserId := parsePromoUserIdFromTradeNo(verifyInfo.ServiceTradeNo)
			if promoUserId > 0 {
				// 使用优惠码充值，给优惠码所有者返利
				processPromoRebate(promoUserId, quotaToAdd)
			} else {
				// 普通充值返利（基于邀请关系）
				model.ProcessTopupRebate(topUp.UserId, quotaToAdd)
			}
		}
	} else {
		log.Printf("易支付异常回调: %v", verifyInfo)
	}
}

func RequestAmount(c *gin.Context) {
	var req AmountRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	if req.Amount < getMinTopup() {
		c.JSON(200, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getMinTopup())})
		return
	}
	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(200, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}

	// 验证优惠码
	_, promoDiscount := validatePromoCode(req.PromoCode, id)

	payMoney := getPayMoney(req.Amount, group, promoDiscount)
	if payMoney <= 0.01 {
		c.JSON(200, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}
	c.JSON(200, gin.H{"message": "success", "data": strconv.FormatFloat(payMoney, 'f', 2, 64)})
}

func GetUserTopUps(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")

	var (
		topups []*model.TopUp
		total  int64
		err    error
	)
	if keyword != "" {
		topups, total, err = model.SearchUserTopUps(userId, keyword, pageInfo)
	} else {
		topups, total, err = model.GetUserTopUps(userId, pageInfo)
	}
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(topups)
	common.ApiSuccess(c, pageInfo)
}

// GetAllTopUps 管理员获取全平台充值记录
func GetAllTopUps(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")

	var (
		topups []*model.TopUp
		total  int64
		err    error
	)
	if keyword != "" {
		topups, total, err = model.SearchAllTopUps(keyword, pageInfo)
	} else {
		topups, total, err = model.GetAllTopUps(pageInfo)
	}
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(topups)
	common.ApiSuccess(c, pageInfo)
}

type AdminCompleteTopupRequest struct {
	TradeNo string `json:"trade_no"`
}

// AdminCompleteTopUp 管理员补单接口
func AdminCompleteTopUp(c *gin.Context) {
	var req AdminCompleteTopupRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.TradeNo == "" {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	// 订单级互斥，防止并发补单
	LockOrder(req.TradeNo)
	defer UnlockOrder(req.TradeNo)

	if err := model.ManualCompleteTopUp(req.TradeNo); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}
