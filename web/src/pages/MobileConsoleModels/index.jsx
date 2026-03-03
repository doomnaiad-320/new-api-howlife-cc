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
import {
  Card,
  Empty,
  Pagination,
  Select,
  SideSheet,
  Skeleton,
  Space,
  Typography,
} from '@douyinfe/semi-ui';
import { Bot, Braces, Copy, Cpu, Search, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { calculateModelPrice } from '../../helpers';
import { useModelPricingData } from '../../hooks/model-pricing/useModelPricingData';

const { Text } = Typography;

const QUOTA_TYPE_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '按量计费', value: 0 },
  { label: '按次计费', value: 1 },
];

const getModelVisualMeta = (model) => {
  const modelName = String(model?.model_name || '').toLowerCase();
  const vendorName = String(model?.vendor_name || '').toLowerCase();

  let iconType = 'generic';
  if (modelName.includes('gpt') || vendorName.includes('openai')) {
    iconType = 'openai';
  } else if (modelName.includes('claude') || vendorName.includes('anthropic')) {
    iconType = 'anthropic';
  } else if (modelName.includes('deepseek') || vendorName.includes('deepseek')) {
    iconType = 'deepseek';
  } else if (modelName.includes('gemini') || vendorName.includes('google')) {
    iconType = 'gemini';
  }

  const iconMap = {
    openai: Sparkles,
    anthropic: Bot,
    deepseek: Braces,
    gemini: Cpu,
    generic: Sparkles,
  };

  const Icon = iconMap[iconType] || Sparkles;
  return { Icon, iconType };
};

const MobileConsoleModels = () => {
  const { t } = useTranslation();
  const modelData = useModelPricingData();
  const [inputTokens, setInputTokens] = useState('');
  const [outputTokens, setOutputTokens] = useState('');
  const [tokenCalcResult, setTokenCalcResult] = useState(null);

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
  const selectedEndpoints = useMemo(() => {
    if (!modelData.selectedModel) return [];
    const mapping = modelData.endpointMap || {};
    const modelName =
      modelData.selectedModel.model_name || modelData.selectedModel.modelName || '';
    const types = Array.isArray(modelData.selectedModel.supported_endpoint_types)
      ? modelData.selectedModel.supported_endpoint_types
      : [];
    return types.map((type) => {
      const info = mapping[type] || {};
      let path = info.path || '';
      if (path.includes('{model}')) {
        path = path.replaceAll('{model}', modelName);
      }
      return {
        type,
        path,
        endpointName: String(type || 'api'),
        method: String(info.method || 'POST').toUpperCase(),
      };
    });
  }, [modelData.selectedModel, modelData.endpointMap]);
  const selectedGroupPriceRows = useMemo(() => {
    if (!modelData.selectedModel) return [];
    const enableGroups = Array.isArray(modelData.selectedModel.enable_groups)
      ? modelData.selectedModel.enable_groups
      : [];
    const availableGroups = Object.keys(modelData.usableGroup || {})
      .filter((group) => group !== '' && group !== 'auto')
      .filter((group) => enableGroups.includes(group));

    return availableGroups.map((group) => {
      const priceData = calculateModelPrice({
        record: modelData.selectedModel,
        selectedGroup: group,
        groupRatio: modelData.groupRatio,
        tokenUnit: modelData.tokenUnit,
        displayPrice: modelData.displayPrice,
        currency: modelData.currency,
      });
      return {
        group,
        ratio: modelData.groupRatio?.[group] ?? 1,
        ...priceData,
      };
    });
  }, [
    modelData.selectedModel,
    modelData.usableGroup,
    modelData.groupRatio,
    modelData.tokenUnit,
    modelData.displayPrice,
    modelData.currency,
  ]);

  useEffect(() => {
    setInputTokens('');
    setOutputTokens('');
    setTokenCalcResult(null);
  }, [modelData.selectedModel?.model_name, modelData.showModelDetail]);

  const tokenCalculatorBase = useMemo(() => {
    if (!modelData.selectedModel) return null;
    const basePrice = calculateModelPrice({
      record: modelData.selectedModel,
      selectedGroup: modelData.selectedGroup,
      groupRatio: modelData.groupRatio,
      tokenUnit: modelData.tokenUnit,
      displayPrice: modelData.displayPrice,
      currency: modelData.currency,
    });
    return {
      isPerToken: basePrice.isPerToken,
      usedGroup: basePrice.usedGroup || '-',
      usedGroupRatio: basePrice.usedGroupRatio ?? 1,
    };
  }, [
    modelData.selectedModel,
    modelData.selectedGroup,
    modelData.groupRatio,
    modelData.tokenUnit,
    modelData.displayPrice,
    modelData.currency,
  ]);

  const handleTokenInput = (setter) => (event) => {
    const numeric = String(event.target.value || '').replace(/[^\d]/g, '');
    setter(numeric);
  };

  const handleCalculateTokenCost = () => {
    if (!modelData.selectedModel || !tokenCalculatorBase) return;
    const inputValue = Number(inputTokens || 0);
    const outputValue = Number(outputTokens || 0);
    const ratio = Number(tokenCalculatorBase.usedGroupRatio || 1);

    if (tokenCalculatorBase.isPerToken) {
      const modelRatio = Number(modelData.selectedModel.model_ratio || 0);
      const completionRatio = Number(modelData.selectedModel.completion_ratio || 0);
      const inputUnitPriceUSD = modelRatio * 2 * ratio;
      const outputUnitPriceUSD = modelRatio * completionRatio * 2 * ratio;
      const totalUSD =
        (inputValue / 1000000) * inputUnitPriceUSD +
        (outputValue / 1000000) * outputUnitPriceUSD;

      setTokenCalcResult({
        isPerToken: true,
        inputValue,
        outputValue,
        totalDisplay: modelData.displayPrice(totalUSD),
        inputUnitDisplay: modelData.displayPrice(inputUnitPriceUSD),
        outputUnitDisplay: modelData.displayPrice(outputUnitPriceUSD),
        usedGroup: tokenCalculatorBase.usedGroup,
      });
      return;
    }

    const perRequestUSD =
      Number(modelData.selectedModel.model_price || 0) * ratio;
    setTokenCalcResult({
      isPerToken: false,
      inputValue,
      outputValue,
      totalDisplay: modelData.displayPrice(perRequestUSD),
      usedGroup: tokenCalculatorBase.usedGroup,
    });
  };

  return (
    <div className='h5-console-page h5-models-page mt-[60px] pb-3'>
      <Space
        vertical
        spacing={12}
        style={{ width: '100%' }}
        className='h5-model-page-stack'
      >
        <Card className='h5-model-panel-card !rounded-2xl'>
          <Space
            vertical
            spacing={8}
            style={{ width: '100%' }}
            className='h5-model-filter-stack'
          >
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
          <Card className='h5-model-panel-card !rounded-2xl'>
            <Skeleton placeholder={<Skeleton.Paragraph rows={4} />} loading />
          </Card>
        ) : paginatedModels.length === 0 ? (
          <Card className='h5-model-panel-card !rounded-2xl'>
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
              const visualMeta = getModelVisualMeta(model);

              return (
                <Card key={model.key || model.model_name} className='h5-model-card !rounded-2xl'>
                  <div className='h5-model-tech-top'>
                    <div className='h5-model-tech-main'>
                      <div
                        className={`h5-model-tech-icon h5-model-tech-icon--${visualMeta.iconType}`}
                      >
                        <visualMeta.Icon size={18} strokeWidth={2.2} />
                      </div>
                      <div className='h5-model-tech-heading'>
                        <div className='h5-model-tech-title-row'>
                          <Text strong className='h5-model-tech-title'>
                            {model.model_name}
                          </Text>
                          <button
                            type='button'
                            className='h5-model-id-copy-btn'
                            onClick={(event) => {
                              event.stopPropagation();
                              modelData.copyText(model.model_name);
                            }}
                            aria-label={t('复制模型名称')}
                            title={t('复制模型名称')}
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <div className='h5-model-tech-vendor'>
                          {(model.vendor_name || t('未知供应商')).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='h5-model-tech-divider' />

                  <div className='h5-model-tech-description'>
                    <span>{t('模型描述')}</span>
                    <p>{model.description || t('暂无描述')}</p>
                  </div>

                  <div className='h5-model-tech-divider' />

                  <div className='h5-model-tech-bottom'>
                    <div
                      className={`h5-model-tech-price ${priceData.isPerToken ? 'is-per-token' : 'is-per-call'}`}
                    >
                      {priceData.isPerToken ? (
                        <>
                          <span className='h5-model-tech-price-item'>
                            {t('输入')}: <strong>{priceData.inputPrice}</strong> / 1
                            {priceData.unitLabel}
                          </span>
                          <span className='h5-model-tech-price-sep'>|</span>
                          <span className='h5-model-tech-price-item'>
                            {t('输出')}: <strong>{priceData.completionPrice}</strong> / 1
                            {priceData.unitLabel}
                          </span>
                        </>
                      ) : (
                        <span className='h5-model-tech-price-item'>
                          {t('价格')}: <strong>{priceData.price}</strong>/{t('每次请求')}
                        </span>
                      )}
                    </div>
                    <button
                      type='button'
                      className='h5-model-tech-detail-btn'
                      onClick={() => modelData.openModelDetail(model)}
                    >
                      {t('详情')}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Card className='h5-model-panel-card !rounded-2xl'>
          <Pagination
            currentPage={modelData.currentPage}
            pageSize={modelData.pageSize}
            total={modelData.filteredModels.length}
            onPageChange={(page) => modelData.setCurrentPage(page)}
            size='small'
          />
        </Card>
      </Space>

      <SideSheet
        visible={modelData.showModelDetail}
        onCancel={modelData.closeModelDetail}
        placement='bottom'
        height='86vh'
        closable={false}
        closeOnEsc
        title={null}
        className='h5-model-detail-sheet'
        bodyStyle={{ padding: 0 }}
      >
        {modelData.selectedModel ? (
          <div className='h5-model-detail-sheet-body'>
            <button
              type='button'
              className='h5-model-detail-sheet-close-btn'
              onClick={modelData.closeModelDetail}
              aria-label={t('关闭')}
              title={t('关闭')}
            >
              <X size={16} />
            </button>
            <div className='h5-model-detail-modal-body'>
              <div className='h5-model-detail-page-title'>
                {modelData.selectedModel.model_name || '-'}
              </div>

              <div className='h5-model-detail-block'>
                <div className='h5-model-detail-block-title'>{t('API 信息')}</div>
                {selectedEndpoints.length > 0 ? (
                  <div className='h5-model-detail-endpoint-list'>
                    {selectedEndpoints.map((endpoint) => (
                      <div key={`${endpoint.type}-${endpoint.path}`} className='h5-model-detail-endpoint-row'>
                        <span className='h5-model-detail-endpoint-inline'>
                          <span className='h5-model-detail-endpoint-provider'>
                            {endpoint.endpointName}：
                          </span>
                          <span className='h5-model-detail-endpoint-path-inline'>
                            {endpoint.path || '-'}
                          </span>
                        </span>
                        <span className='h5-model-detail-endpoint-method'>
                          {endpoint.method}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='h5-model-detail-empty'>{t('暂无可用端点')}</div>
                )}
              </div>

              <div className='h5-model-detail-block'>
                <div className='h5-model-detail-block-title'>{t('分组价格')}</div>
                {selectedGroupPriceRows.length > 0 ? (
                  <div className='h5-model-detail-matrix'>
                    <div
                      className={`h5-model-detail-matrix-head ${selectedGroupPriceRows[0].isPerToken ? '' : 'is-per-call'}`}
                    >
                      <span>{t('分组')}</span>
                      {selectedGroupPriceRows[0].isPerToken ? (
                        <>
                          <span>
                            {t('输入')} / 1{selectedGroupPriceRows[0].unitLabel}
                          </span>
                          <span>
                            {t('输出')} / 1{selectedGroupPriceRows[0].unitLabel}
                          </span>
                        </>
                      ) : (
                        <span>{t('价格 / 每次请求')}</span>
                      )}
                    </div>
                    {selectedGroupPriceRows.map((row) => (
                      <div
                        key={row.group}
                        className={`h5-model-detail-matrix-row ${row.isPerToken ? '' : 'is-per-call'}`}
                      >
                        <div className='h5-model-detail-matrix-group-cell'>
                          <span className='h5-model-detail-matrix-dot' />
                          <span className='h5-model-detail-matrix-group'>{row.group}</span>
                          <span className='h5-model-detail-matrix-ratio'>{row.ratio}x</span>
                        </div>
                        {row.isPerToken ? (
                          <>
                            <span className='h5-model-detail-matrix-price'>{row.inputPrice}</span>
                            <span className='h5-model-detail-matrix-price'>{row.completionPrice}</span>
                          </>
                        ) : (
                          <span className='h5-model-detail-matrix-price'>{row.price}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='h5-model-detail-empty'>{t('当前模型无可展示的分组价格')}</div>
                )}
              </div>

              <div className='h5-model-detail-block'>
                <div className='h5-model-detail-block-title'>{t('Token 计算器')}</div>
                <div className='h5-model-token-calc-grid'>
                  <label className='h5-model-token-calc-field'>
                    <span>{t('输入 Token')}</span>
                    <input
                      value={inputTokens}
                      onChange={handleTokenInput(setInputTokens)}
                      inputMode='numeric'
                      placeholder={t('例如 1000')}
                    />
                  </label>
                  <label className='h5-model-token-calc-field'>
                    <span>{t('输出 Token')}</span>
                    <input
                      value={outputTokens}
                      onChange={handleTokenInput(setOutputTokens)}
                      inputMode='numeric'
                      placeholder={t('例如 500')}
                    />
                  </label>
                </div>
                <button
                  type='button'
                  className='h5-model-token-calc-btn'
                  onClick={handleCalculateTokenCost}
                >
                  {t('计算')}
                </button>

                {tokenCalcResult && (
                  <div className='h5-model-token-calc-result'>
                    <div className='h5-model-token-calc-result-main'>
                      {t('预计花费')}：<strong>{tokenCalcResult.totalDisplay}</strong>
                    </div>
                    <div className='h5-model-token-calc-result-meta'>
                      {t('计费分组')}：{tokenCalcResult.usedGroup}
                    </div>
                    {tokenCalcResult.isPerToken ? (
                      <div className='h5-model-token-calc-result-meta'>
                        {t('单价')}：{t('输入')} {tokenCalcResult.inputUnitDisplay}/1M，{t('输出')}{' '}
                        {tokenCalcResult.outputUnitDisplay}/1M
                      </div>
                    ) : (
                      <div className='h5-model-token-calc-result-meta'>
                        {t('按次计费模型，Token 数量不影响单次请求价格')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </SideSheet>
    </div>
  );
};

export default MobileConsoleModels;
