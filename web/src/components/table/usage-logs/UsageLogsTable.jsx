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
import { Descriptions, Empty, Skeleton } from '@douyinfe/semi-ui';
import CardTable from '../../common/ui/CardTable';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { Copy } from 'lucide-react';
import { getLogsColumns } from './UsageLogsColumnDefs';
import { getLogOther, renderQuota, stringToColor } from '../../../helpers';
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
        return {
          text: t('成功'),
          className: 'is-success',
          isFailure: false,
          statusCode,
        };
      }
      if (statusCode >= 400) {
        return {
          text: t('失败'),
          className: 'is-fail',
          isFailure: true,
          statusCode,
        };
      }
      return {
        text: t('其他'),
        className: 'is-warning',
        isFailure: false,
        statusCode,
      };
    }
    if (record.type === 5) {
      return {
        text: t('失败'),
        className: 'is-fail',
        isFailure: true,
        statusCode: null,
      };
    }
    if (record.type === 2) {
      return {
        text: t('成功'),
        className: 'is-success',
        isFailure: false,
        statusCode: null,
      };
    }
    return {
      text: t('其他'),
      className: 'is-warning',
      isFailure: false,
      statusCode: null,
    };
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

  const formatDuration = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return '-';
    }
    if (Number.isInteger(parsed)) {
      return `${parsed}s`;
    }
    return `${parsed.toFixed(2).replace(/\.?0+$/, '')}s`;
  };

  const formatRatioText = (value) => {
    if (value === undefined || value === null || value === '') {
      return 'x1';
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value <= 0) {
        return 'x1';
      }
      const normalized = Number.isInteger(value)
        ? `${value}`
        : value.toFixed(2).replace(/\.?0+$/, '');
      return `x${normalized}`;
    }

    const text = String(value).trim().replace(/^x\s*/i, '');
    if (!text) {
      return 'x1';
    }

    const parsed = Number(text);
    if (Number.isFinite(parsed)) {
      if (parsed <= 0) {
        return 'x1';
      }
      const normalized = Number.isInteger(parsed)
        ? `${parsed}`
        : parsed.toFixed(2).replace(/\.?0+$/, '');
      return `x${normalized}`;
    }

    return `x${text}`;
  };

  const formatCompactCount = (value) => {
    const count = Math.round(toPositiveNumber(value));
    if (count <= 0) {
      return '0';
    }
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1).replace(/\.0$/, '')}万`;
    }
    return count.toLocaleString();
  };

  const getMobileModelTitleColor = (modelName) => {
    if (!modelName) {
      return 'var(--semi-color-text-0)';
    }
    const colorName = stringToColor(modelName);
    return `rgba(var(--semi-${colorName}-7), 1)`;
  };

  const createMobileMetricToneStyles = (colorName) => {
    return {
      labelStyle: {
        color: `rgba(var(--semi-${colorName}-5), 1)`,
      },
      valueStyle: {
        color: `rgba(var(--semi-${colorName}-7), 1)`,
      },
    };
  };

  const getMobileTimingMetricStyles = (
    value,
    warningThreshold,
    dangerThreshold,
  ) => {
    const timing = Number(value);
    if (!Number.isFinite(timing) || timing <= 0) {
      return {};
    }
    if (timing < warningThreshold) {
      return createMobileMetricToneStyles('green');
    }
    if (timing < dangerThreshold) {
      return createMobileMetricToneStyles('orange');
    }
    return createMobileMetricToneStyles('red');
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
            <div key={item} className='h5-log-card h5-log-card--skeleton'>
              <Skeleton
                placeholder={<Skeleton.Paragraph rows={4} />}
                loading={true}
              />
            </div>
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
          const firstTokenLatency = toPositiveNumber(other.frt);
          const firstTokenSeconds =
            firstTokenLatency > 0
              ? `${(firstTokenLatency / 1000).toFixed(2)}s`
              : '-';
          const promptSnippet = getPromptSnippet(record, other, failureReason);
          const groupValue = record.group || other.group || '-';
          const ratioValue = formatRatioText(
            other?.user_group_ratio ?? other?.group_ratio,
          );
          const metrics = [
            {
              key: 'use_time',
              label: t('耗时'),
              value: formatDuration(record.use_time),
              ...getMobileTimingMetricStyles(record.use_time, 101, 300),
            },
            {
              key: 'first_token',
              label: t('首字'),
              value: firstTokenSeconds,
              ...getMobileTimingMetricStyles(firstTokenLatency / 1000, 3, 10),
            },
            {
              key: 'input',
              label: t('输入'),
              value: formatCompactCount(promptTokens),
            },
            {
              key: 'output',
              label: t('输出'),
              value: formatCompactCount(completionTokens),
            },
          ];
          const detailItems = expandData[record.key] || [];
          const detailSnippet =
            promptSnippet && promptSnippet !== failureReason
              ? promptSnippet
              : '';
          const hasDetails =
            detailItems.length > 0 ||
            Boolean(failureReason) ||
            Boolean(promptSnippet);

          return (
            <article key={record.key} className='h5-log-card'>
              <div className='h5-log-top'>
                <div className='h5-log-main'>
                  <div className='h5-log-header'>
                    <div className='h5-log-model-main'>
                      <span
                        className='h5-log-model-title'
                        style={{
                          color: getMobileModelTitleColor(record.model_name),
                        }}
                      >
                        {record.model_name || '-'}
                      </span>
                      <button
                        type='button'
                        className='h5-log-copy-btn'
                        onClick={(event) =>
                          copyText(event, record.model_name || '-')
                        }
                        aria-label={t('复制模型名称')}
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <span
                      className={`h5-log-status-chip ${statusMeta.className}`}
                    >
                      {statusMeta.text}
                    </span>
                  </div>
                  <div className='h5-log-time'>
                    {record.timestamp2string || '-'}
                  </div>
                </div>
              </div>
              <div className='h5-log-meta-inline-row'>
                <div className='h5-log-meta-inline-list'>
                  <span className='h5-log-meta-inline-item' title={groupValue}>
                    <span>{t('分组')}</span>
                    <strong>{groupValue}</strong>
                  </span>
                  <span className='h5-log-meta-inline-item'>
                    <span>{t('倍率')}</span>
                    <strong>{ratioValue}</strong>
                  </span>
                </div>
                <span className='h5-log-cost-inline'>
                  <span>{t('消耗')}</span>
                  <strong>{renderQuota(record.quota || 0, 2)}</strong>
                </span>
              </div>
              <div className='h5-log-divider' />
              <div className='h5-log-metrics-grid'>
                {metrics.map((item) => (
                  <div key={item.key} className='h5-log-metric-item'>
                    <span style={item.labelStyle}>{item.label}</span>
                    <strong style={item.valueStyle}>{item.value}</strong>
                  </div>
                ))}
              </div>

              {hasDetails ? (
                <details className='h5-log-details'>
                  <summary>{t('查看详情')}</summary>
                  <div className='h5-log-details-panel'>
                    {statusMeta.isFailure && failureReason ? (
                      <div className='h5-log-error'>
                        <div className='h5-log-error-title'>
                          {t('失败原因')}
                        </div>
                        <div className='h5-log-error-content'>
                          {failureReason}
                        </div>
                      </div>
                    ) : null}
                    {detailSnippet ? (
                      <div
                        className={`h5-log-snippet ${statusMeta.isFailure ? 'h5-log-snippet--warning' : ''}`}
                        onClick={(event) => copyText(event, detailSnippet)}
                      >
                        <span className='h5-log-snippet-label'>
                          {t('请求片段')}
                        </span>
                        <code>{detailSnippet}</code>
                      </div>
                    ) : null}
                    {detailItems.length > 0 ? (
                      <Descriptions data={detailItems} />
                    ) : null}
                  </div>
                </details>
              ) : null}
            </article>
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
