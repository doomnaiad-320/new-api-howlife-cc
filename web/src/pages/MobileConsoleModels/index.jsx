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

import React, { useEffect, useMemo } from 'react';
import {
  Button,
  Card,
  Empty,
  Pagination,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import { Copy, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { calculateModelPrice } from '../../helpers';
import { useModelPricingData } from '../../hooks/model-pricing/useModelPricingData';

const { Text } = Typography;

const QUOTA_TYPE_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '按量计费', value: 0 },
  { label: '按次计费', value: 1 },
];

const MobileConsoleModels = () => {
  const { t } = useTranslation();
  const modelData = useModelPricingData();

  useEffect(() => {
    modelData.setFilterEndpointType('all');
    modelData.setFilterTag('all');
  }, []);

  const vendorOptions = useMemo(() => {
    const vendorNames = new Set();
    modelData.models.forEach((item) => {
      if (item.vendor_name) {
        vendorNames.add(item.vendor_name);
      }
    });

    return [
      { label: t('全部供应商'), value: 'all' },
      ...Array.from(vendorNames)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ label: name, value: name })),
    ];
  }, [modelData.models, t]);

  const groupOptions = useMemo(() => {
    const groupSet = new Set();

    Object.keys(modelData.usableGroup || {}).forEach((group) => {
      groupSet.add(group);
    });

    modelData.models.forEach((item) => {
      if (Array.isArray(item.enable_groups)) {
        item.enable_groups.forEach((group) => groupSet.add(group));
      }
    });

    return [
      { label: t('全部分组'), value: 'all' },
      ...Array.from(groupSet)
        .sort((a, b) => a.localeCompare(b))
        .map((group) => ({ label: group, value: group })),
    ];
  }, [modelData.models, modelData.usableGroup, t]);

  const startIndex = (modelData.currentPage - 1) * modelData.pageSize;
  const paginatedModels = modelData.filteredModels.slice(
    startIndex,
    startIndex + modelData.pageSize,
  );

  return (
    <div className='h5-console-page mt-[60px] px-2 pb-3'>
      <Space vertical spacing={12} style={{ width: '100%' }}>
        <Card className='!rounded-2xl'>
          <Space vertical spacing={8} style={{ width: '100%' }}>
            <div className='h5-model-search'>
              <Search size={14} className='h5-model-search-icon' />
              <input
                value={modelData.searchValue}
                onChange={(event) => modelData.handleChange(event.target.value)}
                onCompositionStart={modelData.handleCompositionStart}
                onCompositionEnd={modelData.handleCompositionEnd}
                placeholder={t('搜索模型名称、供应商')}
                className='h5-model-search-input'
              />
            </div>

            <div className='h5-model-filter-grid'>
              <Select
                value={modelData.filterVendor}
                onChange={(value) => modelData.setFilterVendor(value)}
                optionList={vendorOptions}
                size='small'
                style={{ width: '100%' }}
              />
              <Select
                value={modelData.filterQuotaType}
                onChange={(value) =>
                  modelData.setFilterQuotaType(
                    value === 'all' ? 'all' : Number(value),
                  )
                }
                optionList={QUOTA_TYPE_OPTIONS.map((item) => ({
                  label: t(item.label),
                  value: item.value,
                }))}
                size='small'
                style={{ width: '100%' }}
              />
              <Select
                value={modelData.filterGroup}
                onChange={(value) => {
                  modelData.setSelectedGroup(value);
                  modelData.setFilterGroup(value);
                }}
                optionList={groupOptions}
                size='small'
                style={{ width: '100%' }}
              />
            </div>
          </Space>
        </Card>

        {modelData.loading ? (
          <Card className='!rounded-2xl'>
            <Skeleton placeholder={<Skeleton.Paragraph rows={4} />} loading />
          </Card>
        ) : paginatedModels.length === 0 ? (
          <Card className='!rounded-2xl'>
            <Empty image={null} description={t('暂无模型')} />
          </Card>
        ) : (
          <div className='h5-model-list'>
            {paginatedModels.map((model) => {
              const priceData = calculateModelPrice({
                record: model,
                selectedGroup: modelData.selectedGroup,
                groupRatio: modelData.groupRatio,
                tokenUnit: modelData.tokenUnit,
                displayPrice: modelData.displayPrice,
                currency: modelData.currency,
              });

              return (
                <Card key={model.key || model.model_name} className='h5-model-card !rounded-2xl'>
                  <div className='h5-model-card-top'>
                    <div>
                      <Text strong>{model.model_name}</Text>
                      <div className='h5-model-sub'>
                        {model.vendor_name || t('未知供应商')}
                      </div>
                    </div>
                    <Button
                      theme='borderless'
                      icon={<Copy size={14} />}
                      onClick={() => modelData.copyText(model.model_name)}
                    />
                  </div>

                  <div className='h5-model-tags'>
                    <Tag color='white' size='small'>
                      {model.quota_type === 1 ? t('按次计费') : t('按量计费')}
                    </Tag>
                    <Tag color='white' size='small'>
                      {t('分组')}: {priceData.usedGroup || '-'}
                    </Tag>
                    <Tag color={model.enable_groups?.length ? 'green' : 'red'} size='small'>
                      {model.enable_groups?.length ? t('可用') : t('不可用')}
                    </Tag>
                  </div>

                  <div className='h5-model-price'>
                    {priceData.isPerToken ? (
                      <>
                        <div>
                          {t('输入')}: {priceData.inputPrice} / {priceData.unitLabel}
                        </div>
                        <div>
                          {t('输出')}: {priceData.completionPrice} / {priceData.unitLabel}
                        </div>
                      </>
                    ) : (
                      <div>
                        {t('模型价格')}: {priceData.price}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Card className='!rounded-2xl'>
          <Pagination
            currentPage={modelData.currentPage}
            pageSize={modelData.pageSize}
            total={modelData.filteredModels.length}
            onPageChange={(page) => modelData.setCurrentPage(page)}
            size='small'
          />
        </Card>
      </Space>
    </div>
  );
};

export default MobileConsoleModels;
