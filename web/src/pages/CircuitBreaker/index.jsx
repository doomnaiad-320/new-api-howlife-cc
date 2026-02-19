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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';
import HttpStatusCodeRulesInput from '../../components/settings/HttpStatusCodeRulesInput';
import {
  API,
  compareObjects,
  isRoot,
  parseHttpStatusCodeRules,
  showError,
  showSuccess,
  showWarning,
  timestamp2string,
} from '../../helpers';

const DEFAULT_INPUTS = {
  'circuit_breaker_setting.enabled': false,
  'circuit_breaker_setting.consecutive_failures': 3,
  'circuit_breaker_setting.cooldown_seconds': 30,
  'circuit_breaker_setting.failure_window_seconds': 120,
  'circuit_breaker_setting.trigger_status_codes': '429',
  'circuit_breaker_setting.scope_by_model': false,
  'circuit_breaker_setting.scope_by_group': false,
  'circuit_breaker_setting.log_skip_events': false,
};

const { Text } = Typography;

const toBool = (v) => String(v).toLowerCase() === 'true';
const toInt = (v, d) => {
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? d : n;
};

const optionListToMap = (options) => {
  const map = {};
  if (!Array.isArray(options)) return map;
  options.forEach((item) => {
    if (item?.key) {
      map[item.key] = item.value;
    }
  });
  return map;
};

const buildInputsFromOptionMap = (optionMap) => ({
  'circuit_breaker_setting.enabled': toBool(
    optionMap['circuit_breaker_setting.enabled'] ?? DEFAULT_INPUTS['circuit_breaker_setting.enabled'],
  ),
  'circuit_breaker_setting.consecutive_failures': toInt(
    optionMap['circuit_breaker_setting.consecutive_failures'],
    DEFAULT_INPUTS['circuit_breaker_setting.consecutive_failures'],
  ),
  'circuit_breaker_setting.cooldown_seconds': toInt(
    optionMap['circuit_breaker_setting.cooldown_seconds'],
    DEFAULT_INPUTS['circuit_breaker_setting.cooldown_seconds'],
  ),
  'circuit_breaker_setting.failure_window_seconds': toInt(
    optionMap['circuit_breaker_setting.failure_window_seconds'],
    DEFAULT_INPUTS['circuit_breaker_setting.failure_window_seconds'],
  ),
  'circuit_breaker_setting.trigger_status_codes':
    optionMap['circuit_breaker_setting.trigger_status_codes'] ??
    DEFAULT_INPUTS['circuit_breaker_setting.trigger_status_codes'],
  'circuit_breaker_setting.scope_by_model': toBool(
    optionMap['circuit_breaker_setting.scope_by_model'] ??
      DEFAULT_INPUTS['circuit_breaker_setting.scope_by_model'],
  ),
  'circuit_breaker_setting.scope_by_group': toBool(
    optionMap['circuit_breaker_setting.scope_by_group'] ??
      DEFAULT_INPUTS['circuit_breaker_setting.scope_by_group'],
  ),
  'circuit_breaker_setting.log_skip_events': toBool(
    optionMap['circuit_breaker_setting.log_skip_events'] ??
      DEFAULT_INPUTS['circuit_breaker_setting.log_skip_events'],
  ),
});

export default function CircuitBreakerPage() {
  const { t } = useTranslation();
  const refForm = useRef();
  const unsupportedApiWarnedRef = useRef(false);
  const isRootUser = useMemo(() => isRoot(), []);

  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [inputsRow, setInputsRow] = useState(DEFAULT_INPUTS);
  const [states, setStates] = useState([]);
  const [breakerEnabled, setBreakerEnabled] = useState(false);
  const [statesLoading, setStatesLoading] = useState(false);
  const [lastRefreshUnix, setLastRefreshUnix] = useState(0);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const parsedCircuitBreakerStatusCodes = parseHttpStatusCodeRules(
    inputs['circuit_breaker_setting.trigger_status_codes'] || '',
  );

  const hasStatusCode = (parsed, code) =>
    Array.isArray(parsed?.ranges) &&
    parsed.ranges.some((range) => code >= range.start && code <= range.end);

  const refreshStates = useCallback(async (withLoading = false) => {
    if (withLoading) {
      setStatesLoading(true);
    }
    try {
      const res = await API.get('/api/channel/circuit_breaker/states', {
        skipErrorHandler: true,
      });
      const { success, data, message } = res.data;
      if (!success) {
        showError(message || t('获取熔断状态失败'));
        return;
      }
      setBreakerEnabled(Boolean(data?.enabled));
      setStates(Array.isArray(data?.items) ? data.items : []);
      setLastRefreshUnix(
        Number.isFinite(Number(data?.now_unix))
          ? Number(data.now_unix)
          : Math.floor(Date.now() / 1000),
      );
    } catch (error) {
      if (error?.response?.status === 404) {
        setBreakerEnabled(false);
        setStates([]);
        if (!unsupportedApiWarnedRef.current) {
          unsupportedApiWarnedRef.current = true;
          showWarning(
            t('当前后端未包含熔断状态接口，请确认运行的是最新 current 分支代码并重启后端'),
          );
        }
        return;
      }
      showError(t('获取熔断状态失败'));
    } finally {
      if (withLoading) {
        setStatesLoading(false);
      }
    }
  }, [t]);

  const refreshSettings = useCallback(async () => {
    if (!isRootUser) return;
    setSettingsLoading(true);
    try {
      const res = await API.get('/api/option/');
      const { success, data, message } = res.data;
      if (!success) {
        showError(message || t('获取熔断配置失败'));
        return;
      }
      const nextInputs = buildInputsFromOptionMap(optionListToMap(data));
      setInputs(nextInputs);
      setInputsRow(structuredClone(nextInputs));
      refForm.current?.setValues(nextInputs);
    } catch (error) {
      showError(t('获取熔断配置失败'));
    } finally {
      setSettingsLoading(false);
    }
  }, [isRootUser, t]);

  const onSubmit = async () => {
    if (!isRootUser) return;
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    if (!parsedCircuitBreakerStatusCodes.ok) {
      const details =
        parsedCircuitBreakerStatusCodes.invalidTokens &&
        parsedCircuitBreakerStatusCodes.invalidTokens.length > 0
          ? `: ${parsedCircuitBreakerStatusCodes.invalidTokens.join(', ')}`
          : '';
      return showError(`${t('熔断触发状态码格式不正确')}${details}`);
    }
    if (inputs['circuit_breaker_setting.enabled']) {
      if (!hasStatusCode(parsedCircuitBreakerStatusCodes, 429)) {
        return showError(t('熔断触发状态码需要包含 429'));
      }
    }

    setSaving(true);
    try {
      const requestQueue = updateArray.map((item) => {
        let value = '';
        if (typeof inputs[item.key] === 'boolean') {
          value = String(inputs[item.key]);
        } else if (item.key === 'circuit_breaker_setting.trigger_status_codes') {
          value = parsedCircuitBreakerStatusCodes.normalized;
        } else {
          value = String(inputs[item.key]);
        }
        return API.put('/api/option/', {
          key: item.key,
          value,
        });
      });

      const res = await Promise.all(requestQueue);
      if (requestQueue.length === 1) {
        if (res.includes(undefined)) return;
      } else if (requestQueue.length > 1) {
        if (res.includes(undefined)) {
          showError(t('部分保存失败，请重试'));
          return;
        }
      }
      showSuccess(t('保存成功'));
      await refreshSettings();
      await refreshStates();
    } catch (error) {
      showError(t('保存失败，请重试'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    refreshStates(true);
    refreshSettings();
  }, [refreshStates, refreshSettings]);

  const columns = [
    {
      title: t('渠道 ID'),
      dataIndex: 'channel_id',
      width: 100,
    },
    {
      title: t('渠道名称'),
      dataIndex: 'channel_name',
      render: (value) => value || '-',
    },
    {
      title: t('模型'),
      dataIndex: 'model_name',
      render: (value) => value || '-',
    },
    {
      title: t('分组'),
      dataIndex: 'group_name',
      render: (value) => value || '-',
    },
    {
      title: t('触发状态码'),
      dataIndex: 'last_status_code',
      width: 120,
      render: (value) => <Tag color='orange'>{value || '-'}</Tag>,
    },
    {
      title: t('连续失败'),
      dataIndex: 'consecutive_failures',
      width: 120,
    },
    {
      title: t('剩余冷却'),
      dataIndex: 'remaining_seconds',
      width: 140,
      render: (value) => <Tag color='red'>{Math.max(0, value || 0)}s</Tag>,
    },
    {
      title: t('冷却截止时间'),
      dataIndex: 'open_until_unix',
      width: 180,
      render: (value) => (value ? timestamp2string(value) : '-'),
    },
  ];

  return (
    <div className='mt-[60px] px-2'>
      <Row gutter={16}>
        <Col xs={24}>
          <Card
            title={t('熔断状态')}
            headerExtraContent={
              <Space>
                <Tag color={breakerEnabled ? 'green' : 'grey'}>
                  {breakerEnabled ? t('已启用') : t('未启用')}
                </Tag>
                <Text type='tertiary'>
                  {lastRefreshUnix
                    ? `${t('上次刷新')}: ${timestamp2string(lastRefreshUnix)}`
                    : t('手动刷新查看最新状态')}
                </Text>
                <Button size='small' onClick={() => refreshStates(true)}>
                  {t('刷新')}
                </Button>
              </Space>
            }
          >
            <Spin spinning={statesLoading}>
              <Table
                columns={columns}
                dataSource={states}
                rowKey='key'
                pagination={false}
                size='small'
                empty={t('当前没有处于冷却中的渠道')}
              />
            </Spin>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title={t('熔断设置')}>
            {!isRootUser ? (
              <Text type='tertiary'>{t('仅 Root 可修改熔断设置')}</Text>
            ) : (
              <Spin spinning={settingsLoading || saving}>
                <Form
                  values={inputs}
                  getFormApi={(formAPI) => (refForm.current = formAPI)}
                  style={{ marginBottom: 15 }}
                >
                  <Row gutter={16}>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <HttpStatusCodeRulesInput
                        label={t('熔断触发状态码')}
                        field={'circuit_breaker_setting.trigger_status_codes'}
                        placeholder={t('例如：429,500 或 500-599')}
                        extraText={t('当命中这些状态码时计入熔断失败次数')}
                        parsed={parsedCircuitBreakerStatusCodes}
                        invalidText={t('熔断触发状态码格式不正确')}
                        onChange={(value) =>
                          setInputs({
                            ...inputs,
                            'circuit_breaker_setting.trigger_status_codes': value,
                          })
                        }
                      />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <Form.InputNumber
                        field={'circuit_breaker_setting.consecutive_failures'}
                        label={t('连续失败阈值')}
                        min={1}
                        step={1}
                        onChange={(value) =>
                          setInputs({
                            ...inputs,
                            'circuit_breaker_setting.consecutive_failures': toInt(value, 1),
                          })
                        }
                      />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <Form.InputNumber
                        field={'circuit_breaker_setting.cooldown_seconds'}
                        label={t('熔断冷却时长')}
                        min={1}
                        step={1}
                        suffix={t('秒')}
                        onChange={(value) =>
                          setInputs({
                            ...inputs,
                            'circuit_breaker_setting.cooldown_seconds': toInt(value, 1),
                          })
                        }
                      />
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <Form.InputNumber
                        field={'circuit_breaker_setting.failure_window_seconds'}
                        label={t('失败统计窗口')}
                        min={1}
                        step={1}
                        suffix={t('秒')}
                        onChange={(value) =>
                          setInputs({
                            ...inputs,
                            'circuit_breaker_setting.failure_window_seconds': toInt(value, 1),
                          })
                        }
                      />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <Form.Switch
                        field={'circuit_breaker_setting.scope_by_model'}
                        label={t('按模型维度熔断')}
                        size='default'
                        checkedText='｜'
                        uncheckedText='〇'
                        onChange={(value) =>
                          setInputs({
                            ...inputs,
                            'circuit_breaker_setting.scope_by_model': value,
                          })
                        }
                      />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <Form.Switch
                        field={'circuit_breaker_setting.scope_by_group'}
                        label={t('按分组维度熔断')}
                        size='default'
                        checkedText='｜'
                        uncheckedText='〇'
                        onChange={(value) =>
                          setInputs({
                            ...inputs,
                            'circuit_breaker_setting.scope_by_group': value,
                          })
                        }
                      />
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <Form.Switch
                        field={'circuit_breaker_setting.log_skip_events'}
                        label={t('记录冷却跳过日志')}
                        size='default'
                        checkedText='｜'
                        uncheckedText='〇'
                        onChange={(value) =>
                          setInputs({
                            ...inputs,
                            'circuit_breaker_setting.log_skip_events': value,
                          })
                        }
                      />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <Form.Switch
                        field={'circuit_breaker_setting.enabled'}
                        label={t('启用 429 临时熔断')}
                        size='default'
                        checkedText='｜'
                        uncheckedText='〇'
                        onChange={(value) =>
                          setInputs({
                            ...inputs,
                            'circuit_breaker_setting.enabled': value,
                          })
                        }
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Button size='default' onClick={onSubmit}>
                      {t('保存熔断设置')}
                    </Button>
                  </Row>
                </Form>
              </Spin>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
