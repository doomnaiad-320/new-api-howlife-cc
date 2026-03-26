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

import React from 'react';
import { Button, Tag, Skeleton } from '@douyinfe/semi-ui';
import { SlidersHorizontal } from 'lucide-react';
import { renderNumber, renderQuota } from '../../../helpers';
import CompactModeToggle from '../../common/ui/CompactModeToggle';
import { useMinimumLoadingTime } from '../../../hooks/common/useMinimumLoadingTime';
import { useIsMobile } from '../../../hooks/common/useIsMobile';

const LogsActions = ({
  stat,
  loadingStat,
  showStat,
  compactMode,
  setCompactMode,
  onOpenMobileFilters,
  t,
}) => {
  const showSkeleton = useMinimumLoadingTime(loadingStat);
  const needSkeleton = !showStat || showSkeleton;
  const isMobile = useIsMobile();

  const placeholder = (
    <div className='flex flex-wrap gap-2'>
      <Skeleton.Title style={{ width: 108, height: 21, borderRadius: 6 }} />
      <Skeleton.Title style={{ width: 65, height: 21, borderRadius: 6 }} />
      <Skeleton.Title style={{ width: 64, height: 21, borderRadius: 6 }} />
      <Skeleton.Title style={{ width: 92, height: 21, borderRadius: 6 }} />
      <Skeleton.Title style={{ width: 92, height: 21, borderRadius: 6 }} />
      <Skeleton.Title style={{ width: 92, height: 21, borderRadius: 6 }} />
    </div>
  );

  if (isMobile) {
    const mobileStats = [
      { key: 'quota', label: t('消耗额度'), value: renderQuota(stat.quota) },
      { key: 'rpm', label: 'RPM', value: renderNumber(stat.rpm ?? 0) },
      { key: 'tpm', label: 'TPM', value: renderNumber(stat.tpm ?? 0) },
      {
        key: 'request',
        label: t('请求'),
        value: renderNumber(stat.request_count ?? 0),
      },
      {
        key: 'success',
        label: t('成功'),
        value: renderNumber(stat.success_count ?? 0),
      },
      {
        key: 'failure',
        label: t('失败'),
        value: renderNumber(stat.failure_count ?? 0),
      },
    ];

    return (
      <div className='h5-usage-logs-toolbar'>
        <Skeleton loading={needSkeleton} active placeholder={placeholder}>
          <div className='h5-usage-logs-summary'>
            {mobileStats.map((item) => (
              <div key={item.key} className='h5-usage-logs-stat'>
                <span className='h5-usage-logs-stat-label'>{item.label}</span>
                <strong className='h5-usage-logs-stat-value'>
                  {item.value}
                </strong>
              </div>
            ))}
          </div>
        </Skeleton>

        <Button
          type='tertiary'
          theme='outline'
          size='small'
          icon={<SlidersHorizontal size={14} />}
          className='h5-usage-logs-filter-trigger'
          onClick={onOpenMobileFilters}
        >
          {t('筛选与列设置')}
        </Button>
      </div>
    );
  }

  return (
    <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-2 w-full'>
      <Skeleton loading={needSkeleton} active placeholder={placeholder}>
        <div className='flex flex-wrap gap-2 items-center'>
          <Tag
            color='blue'
            style={{
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              padding: 13,
            }}
            className='!rounded-lg'
          >
            {t('消耗额度')}: {renderQuota(stat.quota)}
          </Tag>
          <Tag
            color='pink'
            style={{
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              padding: 13,
            }}
            className='!rounded-lg'
          >
            RPM: {stat.rpm}
          </Tag>
          <Tag
            color='white'
            style={{
              border: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              fontWeight: 500,
              padding: 13,
            }}
            className='!rounded-lg'
          >
            TPM: {stat.tpm}
          </Tag>
          <Tag
            color='cyan'
            style={{
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              padding: 13,
            }}
            className='!rounded-lg'
          >
            {t('请求')}: {renderNumber(stat.request_count ?? 0)}
          </Tag>
          <Tag
            color='green'
            style={{
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              padding: 13,
            }}
            className='!rounded-lg'
          >
            {t('成功')}: {renderNumber(stat.success_count ?? 0)}
          </Tag>
          <Tag
            color='red'
            style={{
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              padding: 13,
            }}
            className='!rounded-lg'
          >
            {t('失败')}: {renderNumber(stat.failure_count ?? 0)}
          </Tag>
        </div>
      </Skeleton>

      <CompactModeToggle
        compactMode={compactMode}
        setCompactMode={setCompactMode}
        t={t}
      />
    </div>
  );
};

export default LogsActions;
