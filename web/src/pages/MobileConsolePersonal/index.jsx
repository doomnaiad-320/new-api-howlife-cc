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

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input, Modal, Typography } from '@douyinfe/semi-ui';
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  Copy,
  KeyRound,
  Lock,
  LogOut,
  Pencil,
  Settings,
  ShieldCheck,
} from 'lucide-react';

import { API, copy, renderQuota, setUserData, showError, showSuccess } from '../../helpers';
import { timestamp2string } from '../../helpers/utils';
import { UserContext } from '../../context/User';
import TokenFormSheet from '../MobileConsoleToken/TokenFormSheet';

const getInitials = (name) => {
  const s = String(name || '').trim();
  if (!s) return 'NA';
  return s.slice(0, 2).toUpperCase();
};

const formatExpiredTime = (ts, t) => {
  const num = Number(ts);
  if (!Number.isFinite(num)) return '-';
  if (num === -1) return t('永不过期');
  if (num <= 0) return '-';
  return timestamp2string(num).slice(0, 16);
};

const maskKey = (raw) => {
  const key = String(raw || '');
  if (!key) return 'sk-';
  if (key.length <= 8) return `sk-${key}`;
  return `sk-${key.slice(0, 4)}**********${key.slice(-4)}`;
};

const MobileConsolePersonal = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userState, userDispatch] = useContext(UserContext);

  const [keySheetOpen, setKeySheetOpen] = useState(false);
  const [latestToken, setLatestToken] = useState(null);
  const [latestTokenLoading, setLatestTokenLoading] = useState(false);
  const [acceptUnsetModelRatioModel, setAcceptUnsetModelRatioModel] = useState(false);
  const [recordIpLog, setRecordIpLog] = useState(false);
  const [settingSaving, setSettingSaving] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    original_password: '',
    set_new_password: '',
    set_new_password_confirmation: '',
  });

  const userName = useMemo(() => {
    return userState?.user?.username || t('未登录');
  }, [t, userState?.user?.username]);
  const email = useMemo(() => {
    const v = String(userState?.user?.email || '').trim();
    return v || t('未绑定邮箱');
  }, [t, userState?.user?.email]);
  const balance = useMemo(() => {
    return renderQuota(userState?.user?.quota || 0);
  }, [userState?.user?.quota]);

  const userSetting = useMemo(() => {
    const raw = userState?.user?.setting;
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }, [userState?.user?.setting]);

  useEffect(() => {
    setAcceptUnsetModelRatioModel(Boolean(userSetting?.accept_unset_model_ratio_model));
  }, [userSetting?.accept_unset_model_ratio_model]);

  useEffect(() => {
    setRecordIpLog(Boolean(userSetting?.record_ip_log));
  }, [userSetting?.record_ip_log]);

  const refreshUserSelf = async () => {
    const res = await API.get('/api/user/self');
    const { success, data, message } = res.data || {};
    if (!success) throw new Error(message || 'failed');
    userDispatch({ type: 'login', payload: data });
    setUserData(data);
  };

  const buildUserSettingPayload = (overrides) => {
    const notifyType = String(userSetting?.notify_type || 'email');
    const thresholdRaw = Number(userSetting?.quota_warning_threshold);
    const quotaWarningThreshold =
      Number.isFinite(thresholdRaw) && thresholdRaw > 0 ? thresholdRaw : 500000;

    const nextAccept =
      overrides?.accept_unset_model_ratio_model !== undefined
        ? overrides.accept_unset_model_ratio_model
        : acceptUnsetModelRatioModel;
    const nextRecordIpLog =
      overrides?.record_ip_log !== undefined ? overrides.record_ip_log : recordIpLog;

    const payload = {
      notify_type: notifyType,
      quota_warning_threshold: quotaWarningThreshold,
      webhook_url: String(userSetting?.webhook_url || ''),
      webhook_secret: String(userSetting?.webhook_secret || ''),
      notification_email: String(userSetting?.notification_email || ''),
      bark_url: String(userSetting?.bark_url || ''),
      gotify_url: String(userSetting?.gotify_url || ''),
      gotify_token: String(userSetting?.gotify_token || ''),
      gotify_priority: (() => {
        const v = parseInt(userSetting?.gotify_priority);
        return Number.isFinite(v) ? v : 5;
      })(),
      accept_unset_model_ratio_model: Boolean(nextAccept),
      record_ip_log: Boolean(nextRecordIpLog),
    };

    // Avoid failing server-side validation due to incomplete configs.
    if (notifyType === 'webhook' && !payload.webhook_url) {
      throw new Error(t('当前通知配置不完整：Webhook 地址为空'));
    }
    if (notifyType === 'bark' && !payload.bark_url) {
      throw new Error(t('当前通知配置不完整：Bark 地址为空'));
    }
    if (notifyType === 'gotify' && (!payload.gotify_url || !payload.gotify_token)) {
      throw new Error(t('当前通知配置不完整：Gotify 地址或令牌为空'));
    }
    return payload;
  };

  const onToggleAcceptUnsetModel = async (next) => {
    if (settingSaving) return;
    setSettingSaving(true);
    try {
      const payload = buildUserSettingPayload({ accept_unset_model_ratio_model: next });
      const res = await API.put('/api/user/setting', payload);
      const { success, message } = res.data || {};
      if (!success) {
        showError(t(message || '设置保存失败'));
        return;
      }
      setAcceptUnsetModelRatioModel(Boolean(next));
      showSuccess(t('设置保存成功'));
      await refreshUserSelf();
    } catch (e) {
      showError(e?.message || t('设置保存失败'));
    } finally {
      setSettingSaving(false);
    }
  };

  const onToggleRecordIpLog = async (next) => {
    if (settingSaving) return;
    setSettingSaving(true);
    try {
      const payload = buildUserSettingPayload({ record_ip_log: next });
      const res = await API.put('/api/user/setting', payload);
      const { success, message } = res.data || {};
      if (!success) {
        showError(t(message || '设置保存失败'));
        return;
      }
      setRecordIpLog(Boolean(next));
      showSuccess(t('设置保存成功'));
      await refreshUserSelf();
    } catch (e) {
      showError(e?.message || t('设置保存失败'));
    } finally {
      setSettingSaving(false);
    }
  };

  const loadLatestToken = async () => {
    setLatestTokenLoading(true);
    try {
      const res = await API.get('/api/token/?p=1&size=1');
      const { success, message, data } = res.data;
      if (!success) {
        showError(t(message));
        return;
      }
      const item = Array.isArray(data?.items) ? data.items[0] : null;
      setLatestToken(item || null);
    } catch (e) {
      // silent, keep UI stable
    } finally {
      setLatestTokenLoading(false);
    }
  };

  useEffect(() => {
    loadLatestToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyToken = async (token) => {
    const content = `sk-${token?.key || ''}`;
    if (await copy(content)) {
      showSuccess(t('已复制到剪贴板！'));
    } else {
      Modal.error({
        title: t('无法复制到剪贴板，请手动复制'),
        content,
        size: 'large',
      });
    }
  };

  const onLogout = () => {
    Modal.confirm({
      title: t('确认退出登录？'),
      content: t('退出后需要重新登录才能继续使用。'),
      onOk: async () => {
        try {
          await API.get('/api/user/logout');
          showSuccess(t('注销成功!'));
          userDispatch({ type: 'logout' });
          localStorage.removeItem('user');
          navigate('/login', { replace: true });
        } catch (e) {
          showError(t('注销失败'));
        }
      },
    });
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setPasswordSaving(false);
    setPasswordForm({
      original_password: '',
      set_new_password: '',
      set_new_password_confirmation: '',
    });
  };

  const changePassword = async () => {
    if (passwordSaving) return;
    const original = String(passwordForm.original_password || '');
    const next = String(passwordForm.set_new_password || '');
    const confirm = String(passwordForm.set_new_password_confirmation || '');

    if (!original) {
      showError(t('请输入原密码！'));
      return;
    }
    if (!next) {
      showError(t('请输入新密码！'));
      return;
    }
    if (original === next) {
      showError(t('新密码需要和原密码不一致！'));
      return;
    }
    if (next !== confirm) {
      showError(t('两次输入的密码不一致！'));
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await API.put(`/api/user/self`, {
        original_password: original,
        password: next,
      });
      const { success, message } = res.data || {};
      if (success) {
        showSuccess(t('密码修改成功！'));
        closePasswordModal();
      } else {
        showError(t(message || '密码修改失败'));
      }
    } catch (e) {
      showError(t('密码修改失败'));
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className='h5-personal-page'>
      <header className='h5-personal-header'>
        <button
          type='button'
          className='h5-personal-header-btn'
          onClick={() => navigate(-1)}
          aria-label={t('返回')}
        >
          <ArrowLeft size={18} />
        </button>
        <div className='h5-personal-header-title'>{t('我的')}</div>
        <button
          type='button'
          className='h5-personal-header-btn'
          onClick={() => {
            Modal.info({
              title: t('设置'),
              content: t('该入口后续可接入更多账户设置项。'),
            });
          }}
          aria-label={t('设置')}
        >
          <Settings size={18} />
        </button>
      </header>

      <TokenFormSheet
        visible={keySheetOpen}
        tokenId={null}
        onClose={() => setKeySheetOpen(false)}
        onSuccess={() => {
          loadLatestToken();
        }}
      />

      <Modal
        visible={passwordModalOpen}
        title={t('修改密码')}
        centered
        onCancel={closePasswordModal}
        onOk={changePassword}
        okText={t('确认')}
        cancelText={t('取消')}
        confirmLoading={passwordSaving}
        size='small'
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              {t('原密码')}
            </Typography.Text>
            <Input
              type='password'
              value={passwordForm.original_password}
              onChange={(v) =>
                setPasswordForm((prev) => ({ ...prev, original_password: v }))
              }
              placeholder={t('请输入原密码')}
              showClear
            />
          </div>
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              {t('新密码')}
            </Typography.Text>
            <Input
              type='password'
              value={passwordForm.set_new_password}
              onChange={(v) =>
                setPasswordForm((prev) => ({ ...prev, set_new_password: v }))
              }
              placeholder={t('请输入新密码')}
              showClear
            />
          </div>
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              {t('确认新密码')}
            </Typography.Text>
            <Input
              type='password'
              value={passwordForm.set_new_password_confirmation}
              onChange={(v) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  set_new_password_confirmation: v,
                }))
              }
              placeholder={t('请再次输入新密码')}
              showClear
            />
          </div>
        </div>
      </Modal>

      <div className='h5-personal-body'>
        <div className='h5-personal-profile'>
          <div className='h5-personal-avatar' aria-hidden='true'>
            <span>{getInitials(userName)}</span>
            <button
              type='button'
              className='h5-personal-avatar-edit'
              onClick={() =>
                Modal.info({
                  title: t('头像'),
                  content: t('后续可接入头像上传/昵称编辑。'),
                })
              }
              aria-label={t('编辑')}
            >
              <Pencil size={14} />
            </button>
          </div>
          <div className='h5-personal-name'>{userName}</div>
          <div className='h5-personal-email'>{email}</div>
        </div>

        <div className='h5-personal-balanceCard'>
          <div className='h5-personal-balanceLeft'>
            <div className='h5-personal-balanceLabel'>{t('钱包余额')}</div>
            <div className='h5-personal-balanceValue'>{balance}</div>
          </div>
          <button
            type='button'
            className='h5-personal-topupBtn'
            onClick={() => navigate('/console/topup')}
          >
            <CreditCard size={14} />
            {t('充值')}
          </button>
        </div>

        <div className='h5-personal-sectionRow'>
          <div className='h5-personal-sectionHint'>{t('系统访问令牌')}</div>
          <button
            type='button'
            className='h5-personal-linkBtn'
            onClick={() => navigate('/console/token')}
          >
            {t('API 管理')}
            <ChevronRight size={16} />
          </button>
        </div>

        <div className='h5-personal-keysCard'>
          <div className='h5-personal-keysCardTop'>
            <div className='h5-personal-keysCardHeader'>
              <div className='h5-personal-keysIcon' aria-hidden='true'>
                <KeyRound size={18} />
              </div>
              <div className='h5-personal-keysCardText'>
                <div className='h5-personal-keysTitle'>{t('Active Keys')}</div>
                <div className='h5-personal-keysDesc'>
                  {t('管理生产与测试环境的访问密钥。')}
                </div>
              </div>
            </div>

            <button
              type='button'
              className='h5-personal-generateBtnInline'
              onClick={() => setKeySheetOpen(true)}
            >
              <span aria-hidden='true'>+</span>
              {t('生成令牌')}
            </button>
          </div>

          <div className='h5-personal-latestToken'>
            <div className='h5-personal-latestTokenHeader'>
              <span className='h5-personal-latestTokenLabel'>{t('最新令牌')}</span>
              <button
                type='button'
                className='h5-personal-latestTokenLink'
                onClick={() => navigate('/console/token')}
              >
                {t('管理')}
                <ChevronRight size={14} />
              </button>
            </div>

            {latestTokenLoading ? (
              <div className='h5-personal-latestTokenEmpty'>{t('加载中...')}</div>
            ) : latestToken ? (
              (() => {
                const unlimited = Boolean(latestToken?.unlimited_quota);
                const used = Number(latestToken?.used_quota || 0);
                const remain = Number(latestToken?.remain_quota || 0);
                const total = unlimited ? 0 : used + remain;

                const expiredUnix = Number(latestToken?.expired_time);
                const isNeverExpire = Number.isFinite(expiredUnix) && expiredUnix === -1;
                const isExpired =
                  Number.isFinite(expiredUnix) &&
                  expiredUnix > 0 &&
                  expiredUnix < Math.floor(Date.now() / 1000);
                const expiredText = formatExpiredTime(latestToken?.expired_time, t);

                const balanceText = unlimited
                  ? t('无限额度')
                  : `${renderQuota(remain)}/${renderQuota(total)}`;

                return (
                  <>
                    <div className='h5-personal-latestTokenRow'>
                      <div className='h5-personal-latestTokenMain'>
                        <div className='h5-personal-latestTokenName'>
                          {latestToken.name || t('未命名密钥')}
                        </div>
                        <div className='h5-personal-latestTokenKey'>
                          {maskKey(latestToken.key)}
                        </div>
                      </div>
                      <button
                        type='button'
                        className='h5-personal-latestTokenCopy'
                        onClick={() => handleCopyToken(latestToken)}
                        aria-label={t('复制')}
                        title={t('复制')}
                      >
                        <Copy size={16} />
                      </button>
                    </div>

                    <div className='h5-personal-latestTokenMeta' aria-label={t('令牌信息')}>
                      <span
                        className={`h5-personal-metaPill is-balance ${
                          unlimited ? 'is-unlimited' : ''
                        }`}
                        title={t('余额')}
                      >
                        <span className='h5-personal-metaPill__k'>{t('余额')}</span>
                        <span className='h5-personal-metaPill__v'>{balanceText}</span>
                      </span>

                      <span
                        className={`h5-personal-metaPill is-expire ${
                          isNeverExpire ? 'is-never' : isExpired ? 'is-expired' : ''
                        }`}
                        title={t('到期日期')}
                      >
                        {isExpired || isNeverExpire ? (
                          <span className='h5-personal-metaPill__v'>
                            {isExpired ? t('已过期') : t('永不过期')}
                          </span>
                        ) : (
                          <>
                            <span className='h5-personal-metaPill__k'>{t('到期')}</span>
                            <span className='h5-personal-metaPill__v'>{expiredText}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </>
                );
              })()
            ) : (
              <div className='h5-personal-latestTokenEmpty'>{t('暂无令牌')}</div>
            )}
          </div>
        </div>

        <div className='h5-personal-blockTitle'>{t('账户管理')}</div>
        <div className='h5-personal-listGroup'>
          <div className='h5-personal-item h5-personal-itemSwitch' role='group'>
            <span className='h5-personal-itemIcon is-amber' aria-hidden='true'>
              <CreditCard size={16} />
            </span>
            <span className='h5-personal-itemTextWrap'>
              <span className='h5-personal-itemText'>{t('接受未设置价格模型')}</span>
              <span className='h5-personal-itemDesc'>
                {t(
                  '当模型没有设置价格时仍接受调用，仅当您信任该网站时使用，可能会产生高额费用',
                )}
              </span>
            </span>
            <button
              type='button'
              className={`h5-personal-miniSwitch ${acceptUnsetModelRatioModel ? 'is-on' : ''}`}
              onClick={() => onToggleAcceptUnsetModel(!acceptUnsetModelRatioModel)}
              aria-label={t('接受未设置价格模型')}
              aria-checked={acceptUnsetModelRatioModel}
              role='switch'
              disabled={settingSaving}
            >
              <span className='h5-personal-miniSwitchKnob' aria-hidden='true' />
            </button>
          </div>

          <div className='h5-personal-item h5-personal-itemSwitch' role='group'>
            <span className='h5-personal-itemIcon is-blue' aria-hidden='true'>
              <ShieldCheck size={16} />
            </span>
            <span className='h5-personal-itemTextWrap'>
              <span className='h5-personal-itemText'>{t('记录请求与错误日志IP')}</span>
              <span className='h5-personal-itemDesc'>
                {t('开启后，仅"消费"和"错误"日志将记录您的客户端IP地址')}
              </span>
            </span>
            <button
              type='button'
              className={`h5-personal-miniSwitch ${recordIpLog ? 'is-on' : ''}`}
              onClick={() => onToggleRecordIpLog(!recordIpLog)}
              aria-label={t('记录请求与错误日志IP')}
              aria-checked={recordIpLog}
              role='switch'
              disabled={settingSaving}
            >
              <span className='h5-personal-miniSwitchKnob' aria-hidden='true' />
            </button>
          </div>

          <button
            type='button'
            className='h5-personal-item'
            onClick={() => setPasswordModalOpen(true)}
          >
            <span className='h5-personal-itemIcon is-indigo' aria-hidden='true'>
              <Lock size={16} />
            </span>
            <span className='h5-personal-itemText'>{t('修改密码')}</span>
            <ChevronRight size={16} className='h5-personal-itemChevron' />
          </button>

          {/*
            暂时隐藏：
            - 身份认证
            - 偏好与设置
            后续需要时再恢复入口。
          */}

          <button type='button' className='h5-personal-item is-logout' onClick={onLogout}>
            <span className='h5-personal-itemIcon is-red' aria-hidden='true'>
              <LogOut size={16} />
            </span>
            <span className='h5-personal-itemText'>{t('退出登录')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileConsolePersonal;
