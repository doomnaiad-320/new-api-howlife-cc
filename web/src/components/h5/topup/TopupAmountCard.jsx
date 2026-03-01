/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useRef } from 'react';
import { Wallet } from 'lucide-react';
import { AppCard } from '../ui';

const TopupAmountCard = ({
  t,
  balance,
  presetAmounts,
  selectedPreset,
  selectPresetAmount,
  topUpCount,
  setTopUpCount,
  setSelectedPreset,
  minTopUp,
  amount,
  amountLoading,
  getAmount,
  payMethods,
  payWay,
  setPayWay,
  onSubmit,
  paymentLoading,
  presetPayAmounts,
  currency,
  priceRatio,
  quotaDisplayType,
  quotaPerUnit,
  promoCode,
  setPromoCode,
  canUsePromoCode,
  rebatePercent,
}) => {
  const debounceRef = useRef(null);
  const currentTopUpCount = Number(topUpCount) || 0;
  const selectedPayMethod = payMethods.find((method) => method.type === payWay);
  const selectedMethodMinTopup = Number(selectedPayMethod?.min_topup || 0);
  const formattedAmount = Number.isFinite(Number(amount)) ? Number(amount).toFixed(2) : '0.00';

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleCustomInput = (e) => {
    const val = String(e.target.value || '').replace(/[^\d]/g, '');
    setTopUpCount(val);
    setSelectedPreset(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val && Number(val) >= minTopUp) getAmount(Number(val));
    }, 500);
  };

  const inferDiscountByPayAmount = (presetAmount, payAmount) => {
    const amountValue = Number(presetAmount);
    const payValue = Number(payAmount);
    const price = Number(priceRatio);
    if (!Number.isFinite(amountValue) || !Number.isFinite(payValue) || amountValue <= 0 || payValue <= 0) {
      return null;
    }

    let baseAmount = amountValue;
    if (quotaDisplayType === 'TOKENS') {
      const quotaUnit = Number(quotaPerUnit);
      if (!Number.isFinite(quotaUnit) || quotaUnit <= 0) return null;
      baseAmount = amountValue / quotaUnit;
    }

    const basePay = baseAmount * (Number.isFinite(price) && price > 0 ? price : 1);
    if (!Number.isFinite(basePay) || basePay <= 0) return null;

    return payValue / basePay;
  };

  const getDiscountLabel = (preset, payAmount) => {
    const configDiscount = Number(preset.discount);
    const inferredDiscount = inferDiscountByPayAmount(preset.value, payAmount);
    const candidates = [configDiscount, inferredDiscount].filter(
      (discount) => Number.isFinite(discount) && discount > 0,
    );
    if (candidates.length === 0) return null;

    const effectiveDiscount = Math.min(...candidates);
    if (effectiveDiscount >= 0.999) return null;
    const zhe = effectiveDiscount * 10;
    return `${zhe % 1 === 0 ? zhe.toFixed(0) : zhe.toFixed(1)}${t('折')}`;
  };

  return (
    <AppCard className='h5-topup-card'>
      {/* Balance */}
      <div className='h5-topup-balance'>
        <div className='h5-topup-balance-row'>
          <Wallet size={15} />
          <span className='h5-topup-balance-label'>{t('当前余额')}</span>
        </div>
        <span className='h5-topup-balance-value'>{balance}</span>
      </div>

      <div className='h5-topup-divider' />

      {/* Preset Amounts */}
      <div className='h5-topup-section'>
        <h4 className='h5-topup-section-title'>{t('选择充值额度')}</h4>
        <div className='h5-topup-preset-grid'>
          {presetAmounts.map((preset) => {
            const payAmount = presetPayAmounts[preset.value];
            const discountLabel = getDiscountLabel(preset, payAmount);
            return (
              <button
                key={preset.value}
                type='button'
                className={`h5-topup-preset-item${selectedPreset === preset.value ? ' is-selected' : ''}${discountLabel ? ' has-discount' : ''}`}
                onClick={() => selectPresetAmount(preset)}
              >
                {discountLabel && (
                  <span className='h5-topup-preset-discount'>{discountLabel}</span>
                )}
                <span className='h5-topup-preset-amount'>{preset.value}</span>
                {payAmount !== undefined && (
                  <span className='h5-topup-preset-pay'>
                    {currency.symbol}
                    {Number(payAmount).toFixed(2)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Amount */}
      <div className='h5-topup-section'>
        <h4 className='h5-topup-section-title'>{t('自定义金额')}</h4>
        <input
          type='text'
          inputMode='numeric'
          pattern='[0-9]*'
          className='h5-topup-input'
          placeholder={`${t('最低')} ${minTopUp}`}
          value={topUpCount}
          min={minTopUp}
          onChange={handleCustomInput}
          onBlur={() => {
            if (!topUpCount) {
              setTopUpCount(minTopUp);
              getAmount(minTopUp);
              return;
            }
            const normalized = Number(topUpCount);
            if (!Number.isFinite(normalized) || normalized < minTopUp) {
              setTopUpCount(minTopUp);
              getAmount(minTopUp);
              return;
            }
            const normalizedInt = Math.floor(normalized);
            setTopUpCount(normalizedInt);
            getAmount(normalizedInt);
          }}
        />
        <div className='h5-topup-pay-summary'>
          <span className='h5-topup-pay-label'>{t('实付金额')}</span>
          <span className='h5-topup-pay-value'>
            {amountLoading ? (
              <span className='h5-topup-dot-loading'>...</span>
            ) : (
              <>
                {currency.symbol}
                {formattedAmount}
              </>
            )}
          </span>
        </div>
      </div>

      {/* Promo Code */}
      {canUsePromoCode && (
        <div className='h5-topup-section'>
          <h4 className='h5-topup-section-title'>{t('优惠码')}</h4>
          <input
            type='text'
            className='h5-topup-input h5-topup-promo-input'
            placeholder={t('输入邀请码享受折扣')}
            value={promoCode}
            maxLength={32}
            onChange={(e) => setPromoCode(e.target.value)}
          />
          <p className='h5-topup-promo-hint'>
            {t('可叠加享受 {{percent}}% 折扣', { percent: rebatePercent })}
          </p>
        </div>
      )}

      {/* Payment Methods */}
      {payMethods.length > 0 && (
        <div className='h5-topup-section'>
          <h4 className='h5-topup-section-title'>{t('支付方式')}</h4>
          <div className='h5-topup-pay-methods'>
            {payMethods.map((method) => (
              <button
                key={method.type}
                type='button'
                className={`h5-topup-pay-btn${payWay === method.type ? ' is-selected' : ''}${currentTopUpCount < Number(method.min_topup || 0) ? ' is-disabled' : ''}`}
                onClick={() => setPayWay(method.type)}
                disabled={currentTopUpCount < Number(method.min_topup || 0)}
                title={
                  currentTopUpCount < Number(method.min_topup || 0)
                    ? t('最低充值 {{amount}}', { amount: Number(method.min_topup || 0) })
                    : ''
                }
              >
                {method.name}
              </button>
            ))}
          </div>
          {selectedMethodMinTopup > 0 && currentTopUpCount < selectedMethodMinTopup ? (
            <p className='h5-topup-helper-error'>
              {t('当前支付方式最低充值数量为 {{amount}}', {
                amount: selectedMethodMinTopup,
              })}
            </p>
          ) : null}
        </div>
      )}

      {/* Submit */}
      <button
        type='button'
        className='h5-app-btn h5-app-btn-primary h5-topup-submit'
        onClick={onSubmit}
        disabled={
          paymentLoading ||
          (payMethods.length > 0 && !payWay) ||
          (selectedMethodMinTopup > 0 && currentTopUpCount < selectedMethodMinTopup)
        }
      >
        {paymentLoading ? t('处理中...') : t('立即充值')}
      </button>
    </AppCard>
  );
};

export default TopupAmountCard;
