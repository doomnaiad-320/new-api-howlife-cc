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

import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Space,
  Spin,
  Table,
  Typography,
} from '@douyinfe/semi-ui';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const createRuleKey = () =>
  `rule_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const createEmptyRule = () => ({
  key: createRuleKey(),
  model: '',
  threshold: 0,
  channel_a_id: 0,
  channel_b_id: 0,
});

const toInteger = (value) => {
  const num = Number(value);
  if (Number.isFinite(num)) {
    return Math.trunc(num);
  }
  return 0;
};

const normalizeRule = (rule) => ({
  model: String(rule.model || '').trim(),
  threshold: Math.max(0, toInteger(rule.threshold)),
  channel_a_id: Math.max(0, toInteger(rule.channel_a_id)),
  channel_b_id: Math.max(0, toInteger(rule.channel_b_id)),
});

const serializeRules = (rules) =>
  JSON.stringify(rules.map(normalizeRule), null, 2);

export default function SettingsTrafficSplitter(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    'traffic_splitter.enabled': false,
    'traffic_splitter.rules': '[]',
  });
  const [rules, setRules] = useState([]);
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  function parseRulesValue(value) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((rule) => ({
        key: createRuleKey(),
        model: rule.model || '',
        threshold: toInteger(rule.threshold),
        channel_a_id: toInteger(rule.channel_a_id),
        channel_b_id: toInteger(rule.channel_b_id),
      }));
    } catch {
      return [];
    }
  }

  function syncRules(nextRules) {
    setRules(nextRules);
    setInputs((prev) => ({
      ...prev,
      'traffic_splitter.rules': serializeRules(nextRules),
    }));
  }

  function updateRule(ruleKey, patch) {
    syncRules(
      rules.map((rule) =>
        rule.key === ruleKey ? { ...rule, ...patch } : rule,
      ),
    );
  }

  function removeRule(ruleKey) {
    syncRules(rules.filter((rule) => rule.key !== ruleKey));
  }

  function addRule() {
    syncRules([...rules, createEmptyRule()]);
  }

  function rulesAreValid() {
    if (rules.length === 0) return true;
    for (const rule of rules) {
      const normalized = normalizeRule(rule);
      if (!normalized.model) return false;
      if (normalized.channel_a_id <= 0 || normalized.channel_b_id <= 0) {
        return false;
      }
    }
    return true;
  }

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    if (!rulesAreValid()) {
      return showError(t('分流规则存在无效数据，请检查模型与渠道 ID'));
    }
    const requestQueue = updateArray.map((item) => {
      let value = '';
      if (typeof inputs[item.key] === 'boolean') {
        value = String(inputs[item.key]);
      } else {
        value = inputs[item.key];
      }
      return API.put('/api/option/', {
        key: item.key,
        value,
      });
    });
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (requestQueue.length === 1) {
          if (res.includes(undefined)) return;
        } else if (requestQueue.length > 1) {
          if (res.includes(undefined))
            return showError(t('部分保存失败，请重试'));
        }
        showSuccess(t('保存成功'));
        props.refresh();
      })
      .catch(() => {
        showError(t('保存失败，请重试'));
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    const currentInputs = {};
    for (let key in props.options) {
      if (Object.keys(inputs).includes(key)) {
        currentInputs[key] = props.options[key];
      }
    }
    const nextRules = parseRulesValue(
      currentInputs['traffic_splitter.rules'],
    );
    currentInputs['traffic_splitter.rules'] = serializeRules(nextRules);
    setInputs(currentInputs);
    setRules(nextRules);
    setInputsRow(structuredClone(currentInputs));
    refForm.current?.setValues(currentInputs);
  }, [props.options]);

  const columns = [
    {
      title: t('模型'),
      dataIndex: 'model',
      render: (value, record) => (
        <Input
          value={record.model}
          onChange={(nextValue) =>
            updateRule(record.key, { model: nextValue })
          }
          placeholder={t('例如 gpt-4o')}
        />
      ),
    },
    {
      title: t('阈值'),
      dataIndex: 'threshold',
      width: 140,
      render: (value, record) => (
        <InputNumber
          value={record.threshold}
          min={0}
          step={1}
          onChange={(nextValue) =>
            updateRule(record.key, { threshold: nextValue })
          }
        />
      ),
    },
    {
      title: t('渠道 A ID'),
      dataIndex: 'channel_a_id',
      width: 140,
      render: (value, record) => (
        <InputNumber
          value={record.channel_a_id}
          min={1}
          step={1}
          onChange={(nextValue) =>
            updateRule(record.key, { channel_a_id: nextValue })
          }
        />
      ),
    },
    {
      title: t('渠道 B ID'),
      dataIndex: 'channel_b_id',
      width: 140,
      render: (value, record) => (
        <InputNumber
          value={record.channel_b_id}
          min={1}
          step={1}
          onChange={(nextValue) =>
            updateRule(record.key, { channel_b_id: nextValue })
          }
        />
      ),
    },
    {
      title: '',
      dataIndex: 'actions',
      width: 90,
      render: (value, record) => (
        <Popconfirm
          title={t('确定删除该规则？')}
          onConfirm={() => removeRule(record.key)}
        >
          <Button size='small' type='danger'>
            {t('删除')}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <Spin spinning={loading}>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={t('分流器管理')}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                <Form.Switch
                  field={'traffic_splitter.enabled'}
                  label={t('启用分流')}
                  size='default'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={(value) =>
                    setInputs({
                      ...inputs,
                      'traffic_splitter.enabled': value,
                    })
                  }
                />
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={24} md={24} lg={24} xl={24}>
                <Space
                  align='center'
                  style={{ marginBottom: 8, width: '100%' }}
                >
                  <Button type='primary' theme='solid' onClick={addRule}>
                    {t('新增规则')}
                  </Button>
                  <Text type='secondary'>
                    {t(
                      'prompt tokens < 阈值走 A，否则走 B；渠道不可用时回退到随机分组。',
                    )}
                  </Text>
                </Space>
                <Table
                  columns={columns}
                  dataSource={rules}
                  rowKey='key'
                  size='small'
                  scroll={{ x: 'max-content' }}
                />
              </Col>
            </Row>
            <Row>
              <Button size='default' onClick={onSubmit}>
                {t('保存分流设置')}
              </Button>
            </Row>
          </Form.Section>
        </Form>
      </Spin>
    </>
  );
}
