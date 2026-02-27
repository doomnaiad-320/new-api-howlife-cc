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

import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import {
  API,
  showError,
  showInfo,
  showSuccess,
  renderQuota,
} from '../../helpers';
import { UserContext } from '../../context/User';
import { StatusContext } from '../../context/Status';
import { getCurrencyConfig } from '../../helpers/render';
import TopupAmountCard from '../../components/h5/topup/TopupAmountCard';
import TopupRedeemCard from '../../components/h5/topup/TopupRedeemCard';

const MobileConsoleTopup = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userState, userDispatch] = useContext(UserContext);
  const [statusState] = useContext(StatusContext);

  const [redemptionCode, setRedemptionCode] = useState('');
  const [topUpCount, setTopUpCount] = useState(1);
  const [amount, setAmount] = useState(0);
  const [minTopUp, setMinTopUp] = useState(1);
  const [enableOnlineTopUp, setEnableOnlineTopUp] = useState(false);
  const [enableStripeTopUp, setEnableStripeTopUp] = useState(false);
  const [payMethods, setPayMethods] = useState([]);
  const [presetAmounts, setPresetAmounts] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [payWay, setPayWay] = useState('');
  const [presetPayAmounts, setPresetPayAmounts] = useState({});
  const [topUpLink, setTopUpLink] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountLoading, setAmountLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const currency = getCurrencyConfig();
  const balance = renderQuota(userState?.user?.quota || 0);
  const cachedStatus = (() => {
    try {
      return JSON.parse(localStorage.getItem('status') || '{}');
    } catch {
      return {};
    }
  })();
  const priceRatio = Number(statusState?.status?.price ?? cachedStatus?.price ?? 1) || 1;
  const quotaDisplayType = localStorage.getItem('quota_display_type') || 'USD';
  const quotaPerUnit = Number(localStorage.getItem('quota_per_unit')) || 1;
  const normalizeTopUpCount = (value, fallback = minTopUp) => {
    const fallbackValue = Number(fallback);
    const safeFallback = Number.isFinite(fallbackValue) && fallbackValue > 0 ? Math.floor(fallbackValue) : 1;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return safeFallback;
    return Math.max(1, Math.floor(numeric));
  };

  const getMethodMinTopUp = (methodType) => {
    const method = payMethods.find((item) => item.type === methodType);
    const methodMin = Number(method?.min_topup);
    return Number.isFinite(methodMin) && methodMin > 0 ? methodMin : 0;
  };

  const resolveDiscountByAmount = (discountMap, amountValue) => {
    if (!discountMap) return null;
    const numericAmount = Number(amountValue);
    const rawDiscount =
      discountMap[amountValue] ??
      discountMap[String(amountValue)] ??
      (Number.isFinite(numericAmount)
        ? discountMap[numericAmount] ??
          discountMap[String(numericAmount)] ??
          discountMap[String(Math.floor(numericAmount))]
        : null) ??
      null;
    const discount = Number(rawDiscount);
    if (!Number.isFinite(discount) || discount <= 0) return null;
    return discount;
  };

  const getUserQuota = async () => {
    try {
      const res = await API.get('/api/user/self');
      const { success, data } = res.data;
      if (success) userDispatch({ type: 'login', payload: data });
    } catch {}
  };

  const getAmount = async (value) => {
    if (value === undefined) value = topUpCount;
    setAmountLoading(true);
    try {
      const res = await API.post('/api/user/amount', { amount: parseFloat(value) });
      if (res?.data?.message === 'success') {
        setAmount(parseFloat(res.data.data));
      }
    } catch {
      setAmount(0);
    }
    setAmountLoading(false);
  };

  const getStripeAmount = async (value) => {
    if (value === undefined) value = topUpCount;
    setAmountLoading(true);
    try {
      const res = await API.post('/api/user/stripe/amount', { amount: parseFloat(value) });
      if (res?.data?.message === 'success') {
        setAmount(parseFloat(res.data.data));
      }
    } catch {
      setAmount(0);
    }
    setAmountLoading(false);
  };

  const refreshAmountForMethod = async (value, methodType = payWay) => {
    const normalizedAmount = normalizeTopUpCount(value);
    if (methodType === 'stripe') {
      await getStripeAmount(normalizedAmount);
      return;
    }
    await getAmount(normalizedAmount);
  };

  const topUp = async () => {
    if (!redemptionCode) {
      showInfo(t('请输入兑换码！'));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await API.post('/api/user/topup', { key: redemptionCode });
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(t('兑换成功！') + ' ' + t('成功兑换额度：') + renderQuota(data));
        if (userState.user) {
          userDispatch({
            type: 'login',
            payload: { ...userState.user, quota: userState.user.quota + data },
          });
        }
        setRedemptionCode('');
      } else {
        showError(message);
      }
    } catch {
      showError(t('请求失败'));
    }
    setIsSubmitting(false);
  };

  const onlineTopUp = async () => {
    if (!payWay) {
      showInfo(t('请选择支付方式'));
      return;
    }

    const normalizedAmount = normalizeTopUpCount(topUpCount);
    const methodMinTopUp = getMethodMinTopUp(payWay);
    const requiredMinTopUp = Math.max(Number(minTopUp) || 1, methodMinTopUp);
    if (normalizedAmount < requiredMinTopUp) {
      showError(t('充值数量不能小于') + ' ' + requiredMinTopUp);
      return;
    }

    if (normalizedAmount !== topUpCount) {
      setTopUpCount(normalizedAmount);
    }

    setPaymentLoading(true);
    try {
      // Refresh amount before payment
      await refreshAmountForMethod(normalizedAmount, payWay);

      let res;
      if (payWay === 'stripe') {
        res = await API.post('/api/user/stripe/pay', {
          amount: normalizedAmount,
          payment_method: 'stripe',
        });
      } else {
        res = await API.post('/api/user/pay', {
          amount: normalizedAmount,
          payment_method: payWay,
        });
      }

      if (res?.data?.message === 'success') {
        const { data } = res.data;
        if (payWay === 'stripe') {
          window.location.href = data.pay_link;
        } else {
          const url = res.data.url;
          if (!url) {
            showError(t('支付请求失败'));
            return;
          }
          const form = document.createElement('form');
          form.action = url;
          form.method = 'POST';
          for (const key in data) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = data[key];
            form.appendChild(input);
          }
          document.body.appendChild(form);
          form.submit();
          document.body.removeChild(form);
        }
      } else {
        showError(res?.data?.data || t('支付请求失败'));
      }
    } catch {
      showError(t('支付请求失败'));
    } finally {
      setPaymentLoading(false);
    }
  };

  const selectPresetAmount = async (preset) => {
    setTopUpCount(preset.value);
    setSelectedPreset(preset.value);
    await refreshAmountForMethod(preset.value, payWay);
  };

  const generatePresetAmounts = (minAmount) => {
    const multipliers = [1, 5, 10, 30, 50, 100];
    return multipliers.map((m) => ({ value: minAmount * m }));
  };

  const fetchPresetPayAmounts = async (presets) => {
    const amounts = {};
    await Promise.all(
      presets.map(async (preset) => {
        try {
          const res = await API.post('/api/user/amount', { amount: parseFloat(preset.value) });
          if (res?.data?.message === 'success') {
            amounts[preset.value] = parseFloat(res.data.data);
          }
        } catch {}
      }),
    );
    setPresetPayAmounts(amounts);
  };

  const getTopupInfo = async () => {
    try {
      const res = await API.get('/api/user/topup/info');
      const { data, success } = res.data;
      if (!success) return;

      let methods = data.pay_methods || [];
      if (typeof methods === 'string') {
        try {
          methods = JSON.parse(methods);
        } catch {
          methods = [];
        }
      }
      methods = (methods || []).filter((m) => m.name && m.type);
      methods = methods.map((m) => {
        const min = Number(m.min_topup);
        let normalizedMin = Number.isFinite(min) ? min : 0;
        if (m.type === 'stripe' && (!normalizedMin || normalizedMin <= 0)) {
          const stripeMin = Number(data.stripe_min_topup);
          if (Number.isFinite(stripeMin)) normalizedMin = stripeMin;
        }
        return { ...m, min_topup: normalizedMin };
      });
      setPayMethods(methods);

      const online = data.enable_online_topup || false;
      const stripe = data.enable_stripe_topup || false;
      setEnableOnlineTopUp(online);
      setEnableStripeTopUp(stripe);
      const minVal = online ? data.min_topup : stripe ? data.stripe_min_topup : 1;
      const normalizedMin = normalizeTopUpCount(minVal, 1);
      setMinTopUp(normalizedMin);
      setTopUpCount(normalizedMin);

      const defaultPayMethod =
        methods.find((method) => normalizedMin >= Number(method.min_topup || 0)) || methods[0];
      const nextPayWay = defaultPayMethod?.type || '';
      setPayWay((prev) => (prev && methods.some((method) => method.type === prev) ? prev : nextPayWay));

      if (data.amount_options?.length > 0) {
        setPresetAmounts(
          data.amount_options.map((amt) => ({
            value: amt,
            discount: resolveDiscountByAmount(data.discount, amt),
          })),
        );
      } else {
        setPresetAmounts(
          generatePresetAmounts(normalizedMin).map((preset) => ({
            ...preset,
            discount: resolveDiscountByAmount(data.discount, preset.value),
          })),
        );
      }

      await refreshAmountForMethod(normalizedMin, nextPayWay);
    } catch {}
  };

  const openTopUpLink = () => {
    if (!topUpLink) {
      showError(t('超级管理员未设置充值链接！'));
      return;
    }
    window.open(topUpLink, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    getUserQuota();
    getTopupInfo();
  }, []);

  useEffect(() => {
    setTopUpLink(statusState?.status?.top_up_link || '');
  }, [statusState?.status?.top_up_link]);

  useEffect(() => {
    if (!payWay) return;
    refreshAmountForMethod(topUpCount, payWay);
  }, [payWay]);

  useEffect(() => {
    if (presetAmounts.length > 0) fetchPresetPayAmounts(presetAmounts);
  }, [presetAmounts]);

  return (
    <div className='h5-topup-page'>
      <header className='h5-topup-header'>
        <button type='button' className='h5-topup-back' onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h2 className='h5-topup-title'>{t('账户充值')}</h2>
        <span className='h5-topup-header-right' />
      </header>

      <div className='h5-topup-body'>
        <TopupAmountCard
          t={t}
          balance={balance}
          presetAmounts={presetAmounts}
          selectedPreset={selectedPreset}
          selectPresetAmount={selectPresetAmount}
          topUpCount={topUpCount}
          setTopUpCount={setTopUpCount}
          setSelectedPreset={setSelectedPreset}
          minTopUp={minTopUp}
          amount={amount}
          amountLoading={amountLoading}
          getAmount={refreshAmountForMethod}
          payMethods={payMethods}
          payWay={payWay}
          setPayWay={setPayWay}
          onSubmit={onlineTopUp}
          paymentLoading={paymentLoading}
          presetPayAmounts={presetPayAmounts}
          currency={currency}
          priceRatio={priceRatio}
          quotaDisplayType={quotaDisplayType}
          quotaPerUnit={quotaPerUnit}
        />

        <TopupRedeemCard
          t={t}
          redemptionCode={redemptionCode}
          setRedemptionCode={setRedemptionCode}
          topUp={topUp}
          isSubmitting={isSubmitting}
          topUpLink={topUpLink}
          openTopUpLink={openTopUpLink}
        />
      </div>
    </div>
  );
};

export default MobileConsoleTopup;
