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

import React, { useEffect, useMemo, useState } from 'react';
import { SideSheet, Button, Spin, Modal, DatePicker } from '@douyinfe/semi-ui';
import { IconClose } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { Check, ChevronRight } from 'lucide-react';

import {
  API,
  getCurrencyConfig,
  showError,
  showSuccess,
  timestamp2string,
} from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { displayAmountToQuota, quotaToDisplayAmount } from '../../helpers/quota';

const getNowUnix = () => Math.floor(Date.now() / 1000);

const EXP_PRESETS = [
  { key: 'never', label: '永不过期' },
  { key: '1d', label: '1天' },
  { key: '7d', label: '7天' },
  { key: '30d', label: '30天' },
  { key: 'custom', label: '自定义' },
];

const presetToExpiredTime = (presetKey, customDate) => {
  const now = getNowUnix();
  switch (presetKey) {
    case 'never':
      return -1;
    case '1d':
      return now + 1 * 24 * 60 * 60;
    case '7d':
      return now + 7 * 24 * 60 * 60;
    case '30d':
      return now + 30 * 24 * 60 * 60;
    case 'custom':
      return customDate instanceof Date && !Number.isNaN(customDate.getTime())
        ? Math.ceil(customDate.getTime() / 1000)
        : -1;
    default:
      return -1;
  }
};

const formatExpiredLabel = (t, expiredUnix) => {
  const v = Number(expiredUnix);
  if (!Number.isFinite(v) || v === -1) return t('永不过期');
  return timestamp2string(v).slice(0, 16);
};

const TokenFormSheet = ({ visible, tokenId, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const isEdit = tokenId !== undefined && tokenId !== null;
  const currency = useMemo(() => getCurrencyConfig(), [visible]);

  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);

  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [unlimitedQuota, setUnlimitedQuota] = useState(true);
  const [remainQuota, setRemainQuota] = useState('0'); // Used when quota_display_type === TOKENS
  const [amountValue, setAmountValue] = useState(''); // Used when quota_display_type !== TOKENS
  // Preserve advanced fields when editing, even if we don't expose them in H5 UI yet.
  const [allowIps, setAllowIps] = useState('');
  const [crossGroupRetry, setCrossGroupRetry] = useState(false);
  const [modelLimitsEnabled, setModelLimitsEnabled] = useState(false);
  const [modelLimits, setModelLimits] = useState('');

  const [expPreset, setExpPreset] = useState('never');
  const [customExpiredDate, setCustomExpiredDate] = useState(null);

  const expiredTimeUnix = useMemo(() => {
    return presetToExpiredTime(expPreset, customExpiredDate);
  }, [expPreset, customExpiredDate]);

  const expiredLabel = useMemo(() => {
    if (expPreset === 'custom' && !(customExpiredDate instanceof Date)) {
      return t('请选择过期时间');
    }
    return formatExpiredLabel(t, expiredTimeUnix);
  }, [t, expPreset, customExpiredDate, expiredTimeUnix]);

  const selectedGroupLabel = useMemo(() => {
    const val = String(group || '').trim();
    const found = groups.find((g) => String(g.value) === val);
    return found?.label || val || '-';
  }, [groups, group]);

  const resetForm = () => {
    setName('');
    setGroup('');
    setUnlimitedQuota(true);
    setRemainQuota('0');
    setAmountValue('');
    setAllowIps('');
    setCrossGroupRetry(false);
    setModelLimitsEnabled(false);
    setModelLimits('');
    setExpPreset('never');
    setCustomExpiredDate(null);
  };

  const loadGroups = async () => {
    try {
      const res = await API.get('/api/user/self/groups');
      const { success, message, data } = res.data;
      if (!success) {
        showError(t(message));
        return;
      }
      const options = Object.entries(data || {}).map(([key, info]) => ({
        value: key,
        label: info?.desc || key,
      }));
      setGroups(options);
      if (!group) {
        const preferred = options.find((o) => o.value === 'default') || options[0];
        if (preferred) setGroup(preferred.value);
      }
    } catch (e) {
      showError(t('加载分组失败'));
    }
  };

  const loadToken = async (id) => {
    setLoading(true);
    try {
      const res = await API.get(`/api/token/${id}`);
      const { success, message, data } = res.data;
      if (!success) {
        showError(t(message));
        return;
      }
      setName(String(data?.name || ''));
      setGroup(String(data?.group || '').trim() || 'default');
      setUnlimitedQuota(Boolean(data?.unlimited_quota));
      setRemainQuota(String(data?.remain_quota ?? 0));
      if (!data?.unlimited_quota) {
        const v = quotaToDisplayAmount(data?.remain_quota || 0);
        // Keep a stable input for currency types (USD/CNY/CUSTOM): show 2 decimals.
        if (currency.type !== 'TOKENS') {
          setAmountValue(Number(v || 0).toFixed(2));
        }
      }
      setAllowIps(String(data?.allow_ips || ''));
      setCrossGroupRetry(Boolean(data?.cross_group_retry));
      setModelLimitsEnabled(Boolean(data?.model_limits_enabled));
      setModelLimits(String(data?.model_limits || ''));

      const exp = Number(data?.expired_time);
      if (!Number.isFinite(exp) || exp === -1) {
        setExpPreset('never');
        setCustomExpiredDate(null);
      } else {
        setExpPreset('custom');
        setCustomExpiredDate(new Date(exp * 1000));
      }
    } catch (e) {
      showError(t('加载令牌失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    loadGroups();
    if (isEdit) {
      loadToken(tokenId);
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tokenId]);

  const handleSubmit = async () => {
    if (loading) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      showError(t('请输入名称'));
      return;
    }
    if (expPreset === 'custom' && !(customExpiredDate instanceof Date)) {
      showError(t('请选择自定义过期时间'));
      return;
    }

    setLoading(true);
    try {
      const remainQuotaValue = (() => {
        if (unlimitedQuota) return 0;
        if (currency.type === 'TOKENS') {
          return parseInt(remainQuota || '0', 10) || 0;
        }
        // Amount is entered in the selected display currency; convert to internal quota units.
        return displayAmountToQuota(amountValue);
      })();

      const payload = {
        name: trimmedName,
        group: String(group || '').trim(),
        unlimited_quota: Boolean(unlimitedQuota),
        remain_quota: remainQuotaValue,
        expired_time: expiredTimeUnix,
        // Keep behavior consistent with existing token forms. For edit, preserve existing values.
        allow_ips: allowIps,
        cross_group_retry: Boolean(crossGroupRetry),
        model_limits_enabled: Boolean(modelLimitsEnabled),
        model_limits: String(modelLimits || ''),
      };

      let res;
      if (isEdit) {
        res = await API.put('/api/token/', { ...payload, id: Number(tokenId) });
      } else {
        res = await API.post('/api/token/', payload);
      }

      const { success, message } = res.data;
      if (!success) {
        showError(t(message));
        return;
      }

      showSuccess(isEdit ? t('令牌更新成功！') : t('令牌创建成功！'));
      onSuccess?.();
      onClose?.();
    } catch (e) {
      showError(t('提交失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SideSheet
      placement='right'
      visible={visible}
      width={isMobile ? '100%' : 520}
      bodyStyle={{ padding: 0 }}
      closeIcon={
        <Button
          className='semi-button-tertiary semi-button-size-small semi-button-borderless'
          type='button'
          icon={<IconClose />}
          onClick={onClose}
          aria-label={t('关闭')}
        />
      }
      title={isEdit ? t('更新令牌信息') : t('创建新令牌')}
      onCancel={onClose}
      footer={
        <div className='h5-token-sheet-footer'>
          <button
            type='button'
            className='h5-token-form-submit-btn'
            onClick={handleSubmit}
            disabled={loading}
          >
            {isEdit ? t('保存') : t('创建')}
          </button>
        </div>
      }
    >
      <Modal
        title={t('选择分组')}
        visible={groupPickerOpen}
        onCancel={() => setGroupPickerOpen(false)}
        footer={null}
        centered
        className='h5-ios-picker-modal'
      >
        <div className='h5-ios-picker-list'>
          {groups.length === 0 ? (
            <div className='h5-ios-picker-empty'>{t('暂无可选分组')}</div>
          ) : (
            groups.map((g) => {
              const selected = String(g.value) === String(group);
              return (
                <button
                  key={g.value}
                  type='button'
                  className={`h5-ios-picker-item ${selected ? 'is-selected' : ''}`}
                  onClick={() => {
                    setGroup(String(g.value));
                    setGroupPickerOpen(false);
                  }}
                >
                  <span className='h5-ios-picker-item-text'>{g.label}</span>
                  {selected ? (
                    <span className='h5-ios-picker-item-icon' aria-hidden='true'>
                      <Check size={16} />
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </Modal>

      <Spin spinning={loading}>
        <div className='h5-token-sheet-body'>
          <div className='h5-ios-group'>
            <div className='h5-ios-row'>
              <div className='h5-ios-row-label'>{t('名称')}</div>
              <div className='h5-ios-row-right'>
                <input
                  className='h5-ios-input'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('例如：我的手机')}
                  inputMode='text'
                  autoComplete='off'
                />
              </div>
            </div>

            <div className='h5-ios-row'>
              <div className='h5-ios-row-label'>{t('分组')}</div>
              <div className='h5-ios-row-right'>
                <button
                  type='button'
                  className='h5-ios-pickerBtn'
                  onClick={() => setGroupPickerOpen(true)}
                  aria-label={t('选择分组')}
                >
                  <span className='h5-ios-pickerValue'>{selectedGroupLabel}</span>
                  <ChevronRight size={16} className='h5-ios-pickerChevron' />
                </button>
              </div>
            </div>
          </div>

          <div className='h5-ios-group'>
            <div className='h5-ios-row'>
              <div className='h5-ios-row-label'>{t('无限额度')}</div>
              <div className='h5-ios-row-right'>
                <label className='h5-ios-switch'>
                  <input
                    type='checkbox'
                    checked={unlimitedQuota}
                    onChange={(e) => setUnlimitedQuota(e.target.checked)}
                  />
                  <span className='h5-ios-switch-ui' aria-hidden='true' />
                </label>
              </div>
            </div>

            {!unlimitedQuota ? (
              <div className='h5-ios-row'>
                <div className='h5-ios-row-label'>
                  {currency.type === 'TOKENS' ? t('剩余额度') : t('额度金额')}
                </div>
                <div className='h5-ios-row-right'>
                  {currency.type === 'TOKENS' ? (
                    <input
                      className='h5-ios-input'
                      value={remainQuota}
                      onChange={(e) => setRemainQuota(e.target.value)}
                      placeholder='0'
                      inputMode='numeric'
                    />
                  ) : (
                    <div className='h5-ios-money'>
                      <span className='h5-ios-money__symbol' aria-hidden='true'>
                        {currency.symbol}
                      </span>
                      <input
                        className='h5-ios-input'
                        value={amountValue}
                        onChange={(e) => setAmountValue(e.target.value)}
                        placeholder='0.00'
                        inputMode='decimal'
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className='h5-ios-group'>
            <div className='h5-ios-row'>
              <div className='h5-ios-row-label'>{t('过期时间')}</div>
              <div className='h5-ios-row-right'>
                <span className='h5-ios-value'>{expiredLabel}</span>
              </div>
            </div>

            <div className='h5-ios-row is-stacked'>
              <div className='h5-ios-seg' role='tablist' aria-label={t('过期时间快选')}>
                {EXP_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type='button'
                    className={`h5-ios-seg-btn ${expPreset === p.key ? 'is-active' : ''}`}
                    onClick={() => setExpPreset(p.key)}
                    role='tab'
                    aria-selected={expPreset === p.key}
                  >
                    {t(p.label)}
                  </button>
                ))}
              </div>
            </div>

            {expPreset === 'custom' ? (
              <div className='h5-ios-row'>
                <div className='h5-ios-row-label'>{t('自定义')}</div>
                <div className='h5-ios-row-right'>
                  <DatePicker
                    type='dateTime'
                    value={customExpiredDate}
                    onChange={(v) => setCustomExpiredDate(v)}
                    placeholder={t('请选择过期时间')}
                    className='h5-ios-datepicker'
                    inputReadOnly
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Spin>
    </SideSheet>
  );
};

export default TokenFormSheet;
