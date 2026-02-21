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

import React, { useMemo } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Skeleton,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import CardTable from '../../common/ui/CardTable';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { getLogsColumns } from './UsageLogsColumnDefs';
import { getLogOther, renderQuota } from '../../../helpers';
import { useIsMobile } from '../../../hooks/common/useIsMobile';

const { Text } = Typography;

const LogsTable = (logsData) => {
  const {
    logs,
    expandData,
    loading,
    activePage,
    pageSize,
    logCount,
    compactMode,
    visibleColumns,
    handlePageChange,
    handlePageSizeChange,
    copyText,
    showUserInfoFunc,
    openChannelAffinityUsageCacheModal,
    hasExpandableRows,
    isAdminUser,
    t,
    COLUMN_KEYS,
  } = logsData;
  const isMobile = useIsMobile();

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

  const getStatusMeta = (record) => {
    if (record.type === 5) {
      return { text: t('失败'), color: 'red' };
    }
    if (record.type === 2) {
      return { text: t('成功'), color: 'green' };
    }
    return { text: t('其他'), color: 'grey' };
  };

  const getFailureReason = (record) => {
    if (record.type !== 5) return '';
    const other = getLogOther(record.other) || {};
    return (
      other.reject_reason ||
      other.error ||
      other.message ||
      record.content ||
      t('未知错误')
    );
  };

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
          const statusMeta = getStatusMeta(record);
          const failureReason = getFailureReason(record);
          const other = getLogOther(record.other) || {};

          return (
            <Card key={record.key} className='h5-log-card !rounded-2xl'>
              <div className='h5-log-card-head'>
                <Text>{record.timestamp2string || '-'}</Text>
                <Tag color={statusMeta.color} size='small'>
                  {statusMeta.text}
                </Tag>
              </div>

              <div className='h5-log-row'>
                <Text type='tertiary'>{t('模型')}</Text>
                <Button
                  theme='borderless'
                  size='small'
                  onClick={(event) => copyText(event, record.model_name || '-')}
                >
                  {record.model_name || '-'}
                </Button>
              </div>

              <div className='h5-log-grid'>
                <div>
                  <Text type='tertiary'>{t('令牌')}</Text>
                  <div>{record.token_name || '-'}</div>
                </div>
                <div>
                  <Text type='tertiary'>{t('分组')}</Text>
                  <div>{record.group || '-'}</div>
                </div>
                <div>
                  <Text type='tertiary'>{t('输入')}</Text>
                  <div>{record.prompt_tokens || 0}</div>
                </div>
                <div>
                  <Text type='tertiary'>{t('输出')}</Text>
                  <div>{record.completion_tokens || 0}</div>
                </div>
                <div>
                  <Text type='tertiary'>{t('耗时')}</Text>
                  <div>
                    {record.use_time || 0}s
                    {other.frt ? ` / ${Number(other.frt / 1000).toFixed(1)}s` : ''}
                  </div>
                </div>
                <div>
                  <Text type='tertiary'>{t('消耗')}</Text>
                  <div>{renderQuota(record.quota || 0, 6)}</div>
                </div>
              </div>

              {failureReason ? (
                <div className='h5-log-error'>
                  <div className='h5-log-error-title'>{t('失败原因')}</div>
                  <div className='h5-log-error-content'>{failureReason}</div>
                  <Button
                    size='small'
                    theme='borderless'
                    onClick={(event) => copyText(event, failureReason)}
                  >
                    {t('复制错误信息')}
                  </Button>
                </div>
              ) : null}

              {expandData[record.key] && expandData[record.key].length > 0 ? (
                <details className='h5-log-details'>
                  <summary>{t('查看详情')}</summary>
                  <Descriptions data={expandData[record.key]} />
                </details>
              ) : null}
            </Card>
          );
        })}
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
