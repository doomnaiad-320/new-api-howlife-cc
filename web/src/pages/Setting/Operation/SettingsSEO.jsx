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

import React, { useEffect, useState, useRef } from 'react';
import { Button, Col, Form, Row, Spin, Banner } from '@douyinfe/semi-ui';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

export default function SettingsSEO(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    SEODescription: '',
    SEOKeywords: '',
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  function handleFieldChange(fieldName) {
    return (value) => {
      setInputs((inputs) => ({ ...inputs, [fieldName]: value }));
    };
  }

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    const requestQueue = updateArray.map((item) => {
      return API.put('/api/option/', {
        key: item.key,
        value: inputs[item.key],
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
        showSuccess(t('保存成功，重启服务后生效'));
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
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
    refForm.current.setValues(currentInputs);
  }, [props.options]);

  return (
    <Spin spinning={loading}>
      <Form
        values={inputs}
        getFormApi={(formAPI) => (refForm.current = formAPI)}
        style={{ marginBottom: 15 }}
      >
        <Form.Section text={t('SEO 设置')}>
          <Banner
            type='info'
            description={t('SEO 设置用于优化搜索引擎收录，修改后需要重启服务才能生效')}
            style={{ marginBottom: 16 }}
          />
          <Row gutter={16}>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.TextArea
                field={'SEODescription'}
                label={t('网站描述')}
                placeholder={t('用于搜索引擎展示的网站描述，建议 50-160 字符')}
                onChange={handleFieldChange('SEODescription')}
                autosize={{ minRows: 2, maxRows: 4 }}
                showClear
              />
            </Col>
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.TextArea
                field={'SEOKeywords'}
                label={t('SEO 关键词')}
                placeholder={t('多个关键词用英文逗号分隔，例如：OpenAI,ChatGPT,API,Claude,Gemini')}
                onChange={handleFieldChange('SEOKeywords')}
                autosize={{ minRows: 2, maxRows: 4 }}
                showClear
                extraText={t('推荐关键词：OpenAI,ChatGPT,API,Claude,Gemini,AI接口,大模型,人工智能,API网关,GPT-4,AI代理,模型聚合')}
              />
            </Col>
          </Row>
          <Row>
            <Button size='default' onClick={onSubmit}>
              {t('保存 SEO 设置')}
            </Button>
          </Row>
        </Form.Section>
      </Form>
    </Spin>
  );
}
