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

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Skeleton,
} from '@douyinfe/semi-ui';
import CardTable from '../../common/ui/CardTable';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { getLogsColumns } from './UsageLogsColumnDefs';
import { getLogOther, renderQuota } from '../../../helpers';
import { useIsMobile } from '../../../hooks/common/useIsMobile';

const LogsTable = (logsData) => {
  const {
    logs,
    expandData,
    loading,
    loadingMore,
    hasMoreLogs,
    activePage,
    pageSize,
    logCount,
    compactMode,
    visibleColumns,
    handlePageChange,
    handlePageSizeChange,
    loadMoreLogs,
    copyText,
    showUserInfoFunc,
    openChannelAffinityUsageCacheModal,
    hasExpandableRows,
    isAdminUser,
    t,
    COLUMN_KEYS,
  } = logsData;
  const isMobile = useIsMobile();
  const h5LoadMoreRef = useRef(null);

  // Get all columns
  const allColumns = useMemo(() => {
    return getLogsColumns({
      t,
      COLUMN_KEYS,
      copyText,
      showUserInfoFunc,
      openChannelAffinityUsageCacheModal,
      isAdminUser,
    });
  }, [
    t,
    COLUMN_KEYS,
    copyText,
    showUserInfoFunc,
    openChannelAffinityUsageCacheModal,
    isAdminUser,
  ]);

  // Filter columns based on visibility settings
  const getVisibleColumns = () => {
    return allColumns.filter((column) => visibleColumns[column.key]);
  };

  const visibleColumnsList = useMemo(() => {
    return getVisibleColumns();
  }, [visibleColumns, allColumns]);

  const tableColumns = useMemo(() => {
    return compactMode
      ? visibleColumnsList.map(({ fixed, ...rest }) => rest)
      : visibleColumnsList;
  }, [compactMode, visibleColumnsList]);

  const expandRowRender = (record, index) => {
    return <Descriptions data={expandData[record.key]} />;
  };

  const parseStatusCode = (value) => {
    if (Number.isInteger(value) && value >= 100 && value <= 599) {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const intValue = Math.trunc(value);
      if (intValue >= 100 && intValue <= 599) {
        return intValue;
      }
    }
    if (typeof value === 'string') {
      const pure = value.trim();
      if (/^\d{3}$/.test(pure)) {
        const parsed = Number(pure);
        if (parsed >= 100 && parsed <= 599) {
          return parsed;
        }
      }
      const matched = pure.match(/\b([1-5]\d{2})\b/);
      if (matched?.[1]) {
        const parsed = Number(matched[1]);
        if (parsed >= 100 && parsed <= 599) {
          return parsed;
        }
      }
    }
    return null;
  };

  const getStatusCodeFromRecord = (record, other) => {
    const candidates = [
      record?.status_code,
      record?.statusCode,
      other?.status_code,
      other?.statusCode,
      other?.status,
      other?.http_status,
      other?.httpStatus,
      other?.response_status,
      other?.responseStatus,
      other?.upstream_status,
      other?.upstream_status_code,
      other?.admin_info?.status_code,
      other?.admin_info?.http_status,
    ];
    for (const candidate of candidates) {
      const parsed = parseStatusCode(candidate);
      if (parsed !== null) return parsed;
    }
    return null;
  };

  const getStatusMeta = (record, other) => {
    const statusCode = getStatusCodeFromRecord(record, other);
    if (statusCode !== null) {
      if (statusCode >= 200 && statusCode < 300) {
        return { text: t('成功'), className: 'is-success', isFailure: false, statusCode };
      }
      if (statusCode >= 400) {
        return { text: t('失败'), className: 'is-fail', isFailure: true, statusCode };
      }
      return { text: t('其他'), className: 'is-warning', isFailure: false, statusCode };
    }
    if (record.type === 5) {
      return { text: t('失败'), className: 'is-fail', isFailure: true, statusCode: null };
    }
    if (record.type === 2) {
      return { text: t('成功'), className: 'is-success', isFailure: false, statusCode: null };
    }
    return { text: t('其他'), className: 'is-warning', isFailure: false, statusCode: null };
  };

  const getFailureReason = (record, other, statusMeta) => {
    if (!statusMeta?.isFailure) return '';
    return (
      other?.reject_reason ||
      other?.error ||
      other?.message ||
      other?.upstream_error_type ||
      other?.upstream_error_code ||
      (record.type === 5 ? record.content : '') ||
      t('请求失败')
    );
  };

  const toPositiveNumber = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed;
  };

  const getPromptSnippet = (record, other, failureReason) => {
    const candidates = [];
    if (typeof other?.prompt === 'string') {
      candidates.push(other.prompt);
    }
    if (Array.isArray(other?.messages)) {
      const textPart = other.messages.find(
        (item) => typeof item?.content === 'string' && item.content.trim(),
      );
      if (textPart?.content) {
        candidates.push(textPart.content);
      }
    }
    if (record.type !== 5 && typeof record?.content === 'string') {
      candidates.push(record.content);
    }
    if (failureReason && typeof failureReason === 'string') {
      candidates.push(failureReason);
    }
    return candidates.find((item) => item && item.trim()) || '';
  };

  useEffect(() => {
    if (!isMobile || !h5LoadMoreRef.current) {
      return;
    }
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      return;
    }
    const observer = new window.IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          loadMoreLogs();
        }
      },
      {
        root: null,
        rootMargin: '180px 0px',
        threshold: 0.01,
      },
    );
    observer.observe(h5LoadMoreRef.current);
    return () => observer.disconnect();
  }, [isMobile, loadMoreLogs, loading, loadingMore, hasMoreLogs, logs.length]);

  if (isMobile) {
    if (loading) {
      return (
        <div className='h5-log-card-list'>
          {[1, 2, 3].map((item) => (
            <Card key={item} className='h5-log-card !rounded-2xl'>
              <Skeleton
                placeholder={<Skeleton.Paragraph rows={4} />}
                loading={true}
              />
            </Card>
          ))}
        </div>
      );
    }

    if (!logs.length) {
      return (
        <Empty
          image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
          darkModeImage={
            <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
          }
          description={t('搜索无结果')}
          style={{ padding: 30 }}
        />
      );
    }

    return (
      <div className='h5-log-card-list'>
        {logs.map((record) => {
          const other = getLogOther(record.other) || {};
          const statusMeta = getStatusMeta(record, other);
          const failureReason = getFailureReason(record, other, statusMeta);
          const promptTokens = toPositiveNumber(record.prompt_tokens);
          const completionTokens = toPositiveNumber(record.completion_tokens);
          const totalTokens = promptTokens + completionTokens;
          const inputBarWidth =
            totalTokens > 0
              ? (promptTokens / totalTokens) * 100
              : 50;
          const outputBarWidth =
            totalTokens > 0
              ? 100 - inputBarWidth
              : 50;
          const firstTokenSeconds =
            toPositiveNumber(other.frt) > 0
              ? `${(toPositiveNumber(other.frt) / 1000).toFixed(2)}s`
              : '-';
          const promptSnippet = getPromptSnippet(record, other, failureReason);
          const groupValue = record.group || other.group || '-';

          return (
            <Card key={record.key} className='h5-log-card !rounded-2xl'>
              <div className='h5-log-header'>
                <Button
                  theme='borderless'
                  size='small'
                  className='h5-log-model-btn'
                  onClick={(event) => copyText(event, record.model_name || '-')}
                >
                  <span className='h5-log-model-title'>{record.model_name || '-'}</span>
                </Button>
                <span className={`h5-log-status-chip ${statusMeta.className}`}>
                  {statusMeta.statusCode
                    ? `${statusMeta.text} ${statusMeta.statusCode}`
                    : statusMeta.text}
                </span>
              </div>
              <div className='h5-log-time-row'>
                <div className='h5-log-time'>{record.timestamp2string || '-'}</div>
                {!statusMeta.isFailure ? (
                  <span className='h5-log-cost-chip'>
                    <span className='h5-log-cost-dot' />
                    <span>{t('消耗')}</span>
                    <strong className='h5-log-cost-value'>
                      {renderQuota(record.quota || 0, 6)}
                    </strong>
                  </span>
                ) : (
                  <span className='h5-log-group-pill' title={groupValue}>
                    <span>{t('分组')}</span>
                    <strong>{groupValue}</strong>
                  </span>
                )}
              </div>

              {!statusMeta.isFailure ? (
                <div className='h5-log-token-layer'>
                  <div className='h5-log-token-stats'>
                    <div className='h5-log-token-item'>
                      <span>{t('Input')}</span>
                      <strong>{promptTokens}</strong>
                    </div>
                    <div className='h5-log-token-item'>
                      <span>{t('Output')}</span>
                      <strong>{completionTokens}</strong>
                    </div>
                  </div>
                  <div className='h5-log-token-bar-container'>
                    <div
                      className='h5-log-token-bar-input'
                      style={{ width: `${inputBarWidth}%` }}
                    />
                    <div
                      className='h5-log-token-bar-output'
                      style={{ width: `${outputBarWidth}%` }}
                    />
                  </div>
                  <div className='h5-log-token-foot'>
                    <span>
                      {t('总 Tokens')}: {totalTokens}
                    </span>
                    <span className='h5-log-group-chip' title={groupValue}>
                      <span>{t('分组')}</span>
                      <strong>{groupValue}</strong>
                    </span>
                  </div>
                </div>
              ) : null}

              {promptSnippet ? (
                <div
                  className={`h5-log-snippet ${statusMeta.isFailure ? 'h5-log-snippet--warning' : ''}`}
                  onClick={(event) => copyText(event, promptSnippet)}
                >
                  <span className='h5-log-snippet-label'>{t('请求片段')}</span>
                  <code>{promptSnippet}</code>
                </div>
              ) : null}

              {!statusMeta.isFailure ? (
                <div className='h5-log-performance'>
                  <div className='h5-log-performance-item'>
                    <span>{t('耗时')}</span>
                    <strong>{toPositiveNumber(record.use_time)}s</strong>
                  </div>
                  <div className='h5-log-performance-item'>
                    <span>{t('首字用时')}</span>
                    <strong>{firstTokenSeconds}</strong>
                  </div>
                </div>
              ) : null}

              {!statusMeta.isFailure &&
              expandData[record.key] &&
              expandData[record.key].length > 0 ? (
                <details className='h5-log-details'>
                  <summary>{t('查看详情')}</summary>
                  <Descriptions data={expandData[record.key]} />
                </details>
              ) : null}
            </Card>
          );
        })}
        <div ref={h5LoadMoreRef} className='h5-log-load-more-anchor' />
        {loadingMore ? (
          <div className='h5-log-load-more-tip'>{t('加载中...')}</div>
        ) : null}
      </div>
    );
  }

  return (
    <CardTable
      columns={tableColumns}
      {...(hasExpandableRows() && {
        expandedRowRender: expandRowRender,
        expandRowByClick: true,
        rowExpandable: (record) =>
          expandData[record.key] && expandData[record.key].length > 0,
      })}
      dataSource={logs}
      rowKey='key'
      loading={loading}
      scroll={compactMode ? undefined : { x: 'max-content' }}
      className='rounded-xl overflow-hidden'
      size='middle'
      empty={
        <Empty
          image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
          darkModeImage={
            <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
          }
          description={t('搜索无结果')}
          style={{ padding: 30 }}
        />
      }
      pagination={{
        currentPage: activePage,
        pageSize: pageSize,
        total: logCount,
        pageSizeOptions: [10, 20, 50, 100],
        showSizeChanger: true,
        onPageSizeChange: (size) => {
          handlePageSizeChange(size);
        },
        onPageChange: handlePageChange,
      }}
      hidePagination={true}
    />
  );
};

export default LogsTable;
