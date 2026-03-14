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

import React, { useMemo, useRef } from 'react';
import { Modal, Skeleton } from '@douyinfe/semi-ui';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTokensData } from '../../hooks/tokens/useTokensData';
import EditTokenModal from '../../components/table/tokens/modals/EditTokenModal';
import { timestamp2string } from '../../helpers/utils';

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

const isActiveStatus = (status) => Number(status) === 1;

const MobileConsoleToken = () => {
  const openFluentNotificationRef = useRef(null);
  const tokensData = useTokensData((key) =>
    openFluentNotificationRef.current?.(key),
  );
  const { t } = tokensData;

  const tokenCountLabel = useMemo(() => {
    const count = Number(tokensData.tokenCount || 0);
    if (!Number.isFinite(count) || count <= 0) return `0`;
    return `${count}`;
  }, [tokensData.tokenCount]);

  const handleCreate = () => {
    tokensData.setEditingToken({ id: undefined });
    tokensData.setShowEdit(true);
  };

  const handleCopy = async (record) => {
    await tokensData.copyText(`sk-${record.key}`);
  };

  const handleEdit = (record) => {
    tokensData.setEditingToken(record);
    tokensData.setShowEdit(true);
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
      <EditTokenModal
        refresh={tokensData.refresh}
        editingToken={tokensData.editingToken}
        visiable={tokensData.showEdit}
        handleClose={tokensData.closeEdit}
      />

      <div className='h5-token-section-header'>
        <div className='h5-token-section-title'>{t('我的密钥')}</div>
        <div className='h5-token-section-count'>
          {t('共 {{count}} 个', { count: tokenCountLabel })}
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
            const statusText = active ? 'Active' : 'Inactive';
            const name = token.name || t('未命名密钥');

            return (
              <div key={token.id} className='h5-token-card' data-status={statusText}>
                <div className='h5-token-card__header'>
                  <div className='h5-token-card__title' title={name}>
                    {name}
                  </div>
                  <div className={`h5-token-card__status ${active ? 'is-active' : 'is-inactive'}`}>
                    {statusText}
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
                    <div className='h5-token-card__metaLabel'>{t('创建时间')}</div>
                    <div className='h5-token-card__metaValue'>
                      {formatCreatedTime(token.created_time)}
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

      <div className='h5-token-safety'>
        <div className='h5-token-safety__title'>{t('安全提示')}</div>
        <div className='h5-token-safety__text'>
          {t(
            '切勿将您的 API Key 分享给他人或提交在客户端代码中。建议定期更换密钥以保证账户安全。',
          )}
        </div>
      </div>

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
