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
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { API, showError, showSuccess, timestamp2string } from '../../helpers';

const getNowUnix = () => Math.floor(Date.now() / 1000);

const toDatetimeLocalValue = (unix) => {
  const n = Number(unix);
  if (!Number.isFinite(n) || n <= 0) return '';
  const d = new Date(n * 1000);
  const pad = (v) => String(v).padStart(2, '0');
  // yyyy-MM-ddTHH:mm (local)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

const parseDatetimeLocalToUnix = (value) => {
  if (!value) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / 1000);
};

const EXP_PRESETS = [
  { key: 'never', label: '永不过期' },
  { key: '1d', label: '1天' },
  { key: '7d', label: '7天' },
  { key: '30d', label: '30天' },
  { key: 'custom', label: '自定义' },
];

const presetToExpiredTime = (presetKey, customUnix) => {
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
      return customUnix ?? -1;
    default:
      return -1;
  }
};

const formatExpiredLabel = (t, expiredUnix) => {
  const v = Number(expiredUnix);
  if (!Number.isFinite(v) || v === -1) return t('永不过期');
  return timestamp2string(v).slice(0, 16);
};

const MobileConsoleTokenForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tokenId } = useParams();

  const isEdit = Boolean(tokenId);
  const title = isEdit ? t('更新令牌') : t('创建令牌');
  const submitText = isEdit ? t('保存') : t('创建');

  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);

  // Minimal form state: focus on layout; expand fields later if needed.
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [unlimitedQuota, setUnlimitedQuota] = useState(true);
  const [remainQuota, setRemainQuota] = useState('0');
  const [allowIps, setAllowIps] = useState('');
  const [crossGroupRetry, setCrossGroupRetry] = useState(false);

  const [expPreset, setExpPreset] = useState('never');
  const [customExpired, setCustomExpired] = useState(''); // datetime-local string

  const expiredTimeUnix = useMemo(() => {
    const customUnix = parseDatetimeLocalToUnix(customExpired);
    return presetToExpiredTime(expPreset, customUnix);
  }, [expPreset, customExpired]);

  const expiredLabel = useMemo(() => {
    return expPreset === 'custom' && customExpired
      ? customExpired.replace('T', ' ')
      : formatExpiredLabel(t, expiredTimeUnix);
  }, [t, expPreset, customExpired, expiredTimeUnix]);

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
        // Prefer default if present, else first.
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
      setAllowIps(String(data?.allow_ips || ''));
      setCrossGroupRetry(Boolean(data?.cross_group_retry));

      const exp = Number(data?.expired_time);
      if (!Number.isFinite(exp) || exp === -1) {
        setExpPreset('never');
        setCustomExpired('');
      } else {
        // Put edited tokens into custom to avoid surprise changes.
        setExpPreset('custom');
        setCustomExpired(toDatetimeLocalValue(exp));
      }
    } catch (e) {
      showError(t('加载令牌失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
    if (isEdit) loadToken(tokenId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId]);

  const handleSubmit = async () => {
    if (loading) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      showError(t('请输入名称'));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: trimmedName,
        group: String(group || '').trim(),
        unlimited_quota: Boolean(unlimitedQuota),
        remain_quota: parseInt(remainQuota || '0', 10) || 0,
        expired_time: expiredTimeUnix,
        allow_ips: allowIps,
        cross_group_retry: Boolean(crossGroupRetry),
        model_limits_enabled: false,
        model_limits: '',
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
      navigate('/console/token', { replace: true });
    } catch (e) {
      showError(t('提交失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='h5-token-form-page'>
      <header className='h5-token-form-header'>
        <button
          type='button'
          className='h5-token-form-back'
          onClick={() => navigate(-1)}
          aria-label={t('返回')}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className='h5-token-form-title'>{title}</h1>
        <div className='h5-token-form-header-right' />
      </header>

      <div className='h5-token-form-body'>
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
              <select
                className='h5-ios-select'
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                aria-label={t('分组')}
              >
                {groups.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
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
              <div className='h5-ios-row-label'>{t('剩余额度')}</div>
              <div className='h5-ios-row-right'>
                <input
                  className='h5-ios-input'
                  value={remainQuota}
                  onChange={(e) => setRemainQuota(e.target.value)}
                  placeholder='0'
                  inputMode='numeric'
                />
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
                <input
                  className='h5-ios-input'
                  type='datetime-local'
                  value={customExpired}
                  onChange={(e) => setCustomExpired(e.target.value)}
                  aria-label={t('自定义过期时间')}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className='h5-ios-group'>
          <div className='h5-ios-row'>
            <div className='h5-ios-row-label'>{t('IP 限制')}</div>
            <div className='h5-ios-row-right'>
              <input
                className='h5-ios-input'
                value={allowIps}
                onChange={(e) => setAllowIps(e.target.value)}
                placeholder={t('留空为不限制')}
                inputMode='text'
                autoComplete='off'
              />
            </div>
          </div>

          <div className='h5-ios-row'>
            <div className='h5-ios-row-label'>{t('跨分组重试')}</div>
            <div className='h5-ios-row-right'>
              <label className='h5-ios-switch'>
                <input
                  type='checkbox'
                  checked={crossGroupRetry}
                  onChange={(e) => setCrossGroupRetry(e.target.checked)}
                />
                <span className='h5-ios-switch-ui' aria-hidden='true' />
              </label>
            </div>
          </div>
        </div>

      </div>

      <div className='h5-token-form-submit'>
        <button
          type='button'
          className='h5-token-form-submit-btn'
          onClick={handleSubmit}
          disabled={loading}
        >
          {submitText}
        </button>
      </div>
    </div>
  );
};

export default MobileConsoleTokenForm;
