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

import React, { useMemo, useRef, useState } from 'react';
import { Modal, Skeleton } from '@douyinfe/semi-ui';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { renderQuota } from '../../helpers';
import { useTokensData } from '../../hooks/tokens/useTokensData';
import { timestamp2string } from '../../helpers/utils';
import TokenFormSheet from './TokenFormSheet';

const maskKey = (raw) => {
  const key = String(raw || '');
  if (!key) return 'sk-';
  if (key.length <= 8) return `sk-${key}`;
  return `sk-${key.slice(0, 4)}**********${key.slice(-4)}`;
};

const formatCreatedTime = (ts) => {
  const num = Number(ts || 0);
  if (!Number.isFinite(num) || num <= 0) return '-';
  // timestamp2string -> "YYYY-MM-DD HH:mm:ss"
  return timestamp2string(num).slice(0, 16);
};

const formatExpiredTime = (ts, t) => {
  const num = Number(ts);
  if (!Number.isFinite(num)) return '-';
  if (num === -1) return t('永不过期');
  if (num <= 0) return '-';
  return timestamp2string(num).slice(0, 16);
};

const TokenQuotaUsage = ({ record, t }) => {
  const unlimited = Boolean(record?.unlimited_quota);
  const used = Number(record?.used_quota || 0);
  const remain = Number(record?.remain_quota || 0);
  const total = unlimited ? 0 : used + remain;
  const percent = unlimited || total <= 0 ? 0 : (remain / total) * 100;
  const clamped = Math.max(0, Math.min(100, percent));

  if (unlimited) {
    return (
      <div className='h5-token-quotaTag' role='status' aria-label={t('无限额度')}>
        {t('无限额度')}
      </div>
    );
  }

  return (
    <div className='h5-token-quotaCompact'>
      <div className='h5-token-quotaCompact__row'>
        <div className='h5-token-quotaCompact__chip is-remain'>
          <span className='h5-token-quotaCompact__k'>{t('剩余')}</span>
          <span className='h5-token-quotaCompact__v'>{renderQuota(remain)}</span>
        </div>
        <div className='h5-token-quotaCompact__chip is-total'>
          <span className='h5-token-quotaCompact__k'>{t('总额度')}</span>
          <span className='h5-token-quotaCompact__v'>{renderQuota(total)}</span>
        </div>
      </div>
    </div>
  );
};

const formatTokenGroup = (record, t) => {
  if (!record) return '-';
  const group = String(record.group || '').trim();
  if (!group) return 'default';
  if (group === 'auto') {
    return `${t('智能熔断')}${record.cross_group_retry ? `(${t('跨分组')})` : ''}`;
  }
  return group;
};

const hashStringToHue = (input) => {
  const str = String(input || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
};

const getGroupTagStyle = (group, active) => {
  const raw = String(group || '').trim() || 'default';
  const hue = hashStringToHue(raw);
  // Keep readable contrast in both light/dark themes; inactive is slightly muted.
  const fgAlpha = active ? 0.98 : 0.78;
  const bgAlpha = active ? 0.14 : 0.08;
  const bdAlpha = active ? 0.26 : 0.16;
  return {
    '--h5-token-group-fg': `hsla(${hue}, 82%, 52%, ${fgAlpha})`,
    '--h5-token-group-bg': `hsla(${hue}, 86%, 52%, ${bgAlpha})`,
    '--h5-token-group-bd': `hsla(${hue}, 86%, 52%, ${bdAlpha})`,
  };
};

const isActiveStatus = (status) => Number(status) === 1;

const MobileConsoleToken = () => {
  const openFluentNotificationRef = useRef(null);
  const tokensData = useTokensData((key) =>
    openFluentNotificationRef.current?.(key),
  );
  const { t } = tokensData;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTokenId, setSheetTokenId] = useState(null);

  const tokenCountLabel = useMemo(() => {
    const count = Number(tokensData.tokenCount || 0);
    if (!Number.isFinite(count) || count <= 0) return `0`;
    return `${count}`;
  }, [tokensData.tokenCount]);

  const handleCreate = () => {
    setSheetTokenId(null);
    setSheetOpen(true);
  };

  const handleCopy = async (record) => {
    await tokensData.copyText(`sk-${record.key}`);
  };

  const handleEdit = (record) => {
    setSheetTokenId(record.id);
    setSheetOpen(true);
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: t('确定是否要删除此令牌？'),
      content: t('此修改将不可逆'),
      onOk: () => {
        (async () => {
          await tokensData.manageToken(record.id, 'delete', record);
          await tokensData.refresh();
        })();
      },
    });
  };

  return (
    <div className='h5-console-page h5-token-page mt-[60px] px-2 pb-3'>
      <TokenFormSheet
        visible={sheetOpen}
        tokenId={sheetTokenId}
        onClose={() => setSheetOpen(false)}
        onSuccess={() => tokensData.refresh()}
      />

      <div className='h5-token-section-header'>
        <div className='h5-token-section-title'>{t('我的密钥')}</div>
        <div className='h5-token-section-count'>
          {t('共 {{count}} 个', { count: tokenCountLabel })}
        </div>
      </div>

      <div className='h5-token-safety-ticker' role='note' aria-label={t('安全提示')}>
        <span className='h5-token-safety-ticker__dot' aria-hidden='true' />
        <div className='h5-token-safety-ticker__viewport'>
          <div className='h5-token-safety-ticker__track'>
            {t('请勿泄露 API Key，建议定期更换')}
          </div>
        </div>
      </div>

      {tokensData.loading ? (
        <div className='h5-token-skeleton'>
          <Skeleton placeholder={<Skeleton.Paragraph rows={6} />} loading />
        </div>
      ) : tokensData.tokens.length === 0 ? (
        <div className='h5-token-empty'>
          <div className='h5-token-empty-title'>{t('暂无密钥')}</div>
          <div className='h5-token-empty-hint'>{t('请点击上方按钮创建新的 API Key')}</div>
        </div>
      ) : (
        <div className='h5-token-list'>
          {tokensData.tokens.map((token) => {
            const active = isActiveStatus(token.status);
            const groupText = formatTokenGroup(token, t);
            const name = token.name || t('未命名密钥');
            const expiredText = formatExpiredTime(token.expired_time, t);
            const expiredUnix = Number(token.expired_time);
            const isNeverExpire = Number.isFinite(expiredUnix) && expiredUnix === -1;
            const isExpired =
              Number.isFinite(expiredUnix) &&
              expiredUnix > 0 &&
              expiredUnix < Math.floor(Date.now() / 1000);

            return (
              <div
                key={token.id}
                className='h5-token-card'
                data-status={active ? 'active' : 'inactive'}
              >
                <div className='h5-token-card__header'>
                  <div className='h5-token-card__heading'>
                    <div className='h5-token-card__title' title={name}>
                      {name}
                    </div>
                    <div className='h5-token-card__times'>
                      <span className='h5-token-card__created' title={t('创建时间')}>
                        {t('创建')} {formatCreatedTime(token.created_time)}
                      </span>
                      <span
                        className={`h5-token-card__expires ${
                          isNeverExpire ? 'is-never' : isExpired ? 'is-expired' : ''
                        }`}
                        title={t('到期日期')}
                      >
                        {t('到期')} {expiredText}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`h5-token-card__status ${active ? 'is-active' : 'is-inactive'}`}
                    style={getGroupTagStyle(token.group, active)}
                    title={groupText}
                  >
                    {groupText}
                  </div>
                </div>

                <div className='h5-token-card__keyRow'>
                  <div className='h5-token-card__keyPill'>
                    <code>{maskKey(token.key)}</code>
                  </div>
                  <button
                    type='button'
                    className='h5-token-card__copyBtn'
                    onClick={() => handleCopy(token)}
                    aria-label={t('复制')}
                    title={t('复制')}
                  >
                    <Copy size={16} />
                  </button>
                </div>

                  <div className='h5-token-card__footer'>
                    <div className='h5-token-card__meta'>
                      <div className='h5-token-card__quota'>
                        <TokenQuotaUsage record={token} t={t} />
                      </div>
                    </div>

                  <div className='h5-token-card__actions'>
                    {active ? (
                      <button
                        type='button'
                        className='h5-token-card__iconBtn'
                        onClick={() => handleEdit(token)}
                        aria-label={t('编辑')}
                        title={t('编辑')}
                      >
                        <Pencil size={16} />
                      </button>
                    ) : null}
                    <button
                      type='button'
                      className='h5-token-card__iconBtn is-danger'
                      onClick={() => handleDelete(token)}
                      aria-label={t('删除')}
                      title={t('删除')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className='h5-token-bottom-cta'>
        <button type='button' className='h5-token-create-btn' onClick={handleCreate}>
          <span className='h5-token-create-icon' aria-hidden='true'>
            <Plus size={16} />
          </span>
          <span>{t('创建新 API Key')}</span>
        </button>
      </div>
    </div>
  );
};

export default MobileConsoleToken;
