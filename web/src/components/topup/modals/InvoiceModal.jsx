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
  Modal,
  Card,
  Typography,
  Button,
  Input,
  InputNumber,
  Space,
  TextArea,
  Toast,
  Empty,
  Tag,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { API, timestamp2string } from '../../../helpers';
import CardTable from '../../common/ui/CardTable';
import { useIsMobile } from '../../../hooks/common/useIsMobile';

const { Text } = Typography;

const STATUS_CONFIG = {
  pending: { color: 'orange', label: '待开票' },
  approved: { color: 'green', label: '已开票' },
  rejected: { color: 'red', label: '已拒绝' },
};

const createInitialForm = (defaultEmail = '') => ({
  amount: undefined,
  invoice_title: '',
  tax_number: '',
  email: defaultEmail || '',
  remark: '',
});

const formatMoney = (value) => `¥${Number(value || 0).toFixed(2)}`;

const SummaryCard = ({ label, value, hint }) => (
  <Card className='!rounded-xl border-0 shadow-sm'>
    <div className='space-y-1'>
      <Text type='tertiary' className='text-sm'>
        {label}
      </Text>
      <div className='text-2xl font-semibold'>{formatMoney(value)}</div>
      {hint ? (
        <Text type='tertiary' className='text-xs'>
          {hint}
        </Text>
      ) : null}
    </div>
  </Card>
);

const InvoiceModal = ({ visible, onCancel, t, defaultEmail = '' }) => {
  const isMobile = useIsMobile();
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(createInitialForm(defaultEmail));

  const loadSummary = async () => {
    const res = await API.get('/api/user/invoice/summary');
    const { success, message, data } = res.data;
    if (!success) {
      throw new Error(message || t('加载可开票金额失败'));
    }
    setSummary(data || null);
  };

  const loadInvoices = async (currentPage, currentPageSize) => {
    const res = await API.get(
      `/api/user/invoice/self?p=${currentPage}&page_size=${currentPageSize}`,
    );
    const { success, message, data } = res.data;
    if (!success) {
      throw new Error(message || t('加载开票记录失败'));
    }
    setInvoices(data?.items || []);
    setTotal(data?.total || 0);
  };

  const loadData = async (currentPage = page, currentPageSize = pageSize) => {
    setLoading(true);
    try {
      await Promise.all([loadSummary(), loadInvoices(currentPage, currentPageSize)]);
    } catch (error) {
      Toast.error({ content: error.message || t('加载失败') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setForm((prev) => ({
      ...prev,
      email: prev.email || defaultEmail || '',
    }));
    loadData(page, pageSize);
  }, [visible, page, pageSize]);

  useEffect(() => {
    if (!visible || !defaultEmail) return;
    setForm((prev) => ({
      ...prev,
      email: prev.email || defaultEmail,
    }));
  }, [defaultEmail, visible]);

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(createInitialForm(defaultEmail));
  };

  const handleSubmit = async () => {
    const payload = {
      amount: Number(form.amount || 0),
      invoice_title: String(form.invoice_title || '').trim(),
      tax_number: String(form.tax_number || '').trim(),
      email: String(form.email || '').trim(),
      remark: String(form.remark || '').trim(),
    };

    if (!payload.amount || payload.amount <= 0) {
      Toast.error({ content: t('请输入正确的开票金额') });
      return;
    }
    if (!payload.invoice_title) {
      Toast.error({ content: t('请输入发票抬头') });
      return;
    }
    if (!payload.tax_number) {
      Toast.error({ content: t('请输入税号') });
      return;
    }
    if (!payload.email) {
      Toast.error({ content: t('请输入邮箱') });
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await API.post('/api/user/invoice', payload);
      const { success, message, data } = res.data;
      if (!success) {
        Toast.error({ content: message || t('提交失败') });
        return;
      }

      Toast.success({ content: t('开票申请已提交') });
      setSummary(data?.summary || null);
      resetForm();
      setPage(1);
      await loadInvoices(1, pageSize);
    } catch (error) {
      Toast.error({ content: error.message || t('提交失败') });
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: t('金额'),
        dataIndex: 'amount',
        key: 'amount',
        render: (value) => <Text strong>{formatMoney(value)}</Text>,
      },
      {
        title: t('发票抬头'),
        dataIndex: 'invoice_title',
        key: 'invoice_title',
      },
      {
        title: t('税号'),
        dataIndex: 'tax_number',
        key: 'tax_number',
      },
      {
        title: t('邮箱'),
        dataIndex: 'email',
        key: 'email',
      },
      {
        title: t('状态'),
        dataIndex: 'status',
        key: 'status',
        render: (status) => {
          const config = STATUS_CONFIG[status] || {
            color: 'grey',
            label: status || '-',
          };
          return (
            <Tag color={config.color} shape='circle'>
              {t(config.label)}
            </Tag>
          );
        },
      },
      {
        title: t('拒绝原因'),
        dataIndex: 'reject_reason',
        key: 'reject_reason',
        render: (value) => value || '-',
      },
      {
        title: t('申请时间'),
        dataIndex: 'created_at',
        key: 'created_at',
        render: (value) => (value ? timestamp2string(value) : '-'),
      },
      {
        title: t('处理时间'),
        dataIndex: 'processed_at',
        key: 'processed_at',
        render: (value) => (value ? timestamp2string(value) : '-'),
      },
    ],
    [t],
  );

  return (
    <Modal
      title={t('发票申请')}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      size={isMobile ? 'full-width' : 'large'}
    >
      <div className='space-y-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          <SummaryCard
            label={t('当前可开票金额')}
            value={summary?.available_amount || 0}
            hint={t('仅统计成功充值，且已扣除待开票和已开票申请')}
          />
          <SummaryCard
            label={t('累计可开票金额')}
            value={summary?.eligible_amount || 0}
            hint={t('仅统计成功充值金额')}
          />
          <SummaryCard
            label={t('已占用开票金额')}
            value={summary?.reserved_amount || 0}
            hint={t('包含待开票和已开票状态')}
          />
        </div>

        <Card className='!rounded-xl border-0 shadow-sm'>
          <Space vertical style={{ width: '100%' }} spacing='medium'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <Text strong>{t('新增开票申请')}</Text>
                <div className='text-xs text-[var(--semi-color-text-2)] mt-1'>
                  {t('提交后可在下方查看审核状态与拒绝原因')}
                </div>
              </div>
              <Button
                type='primary'
                theme='solid'
                loading={submitLoading}
                disabled={(summary?.available_amount || 0) <= 0}
                onClick={handleSubmit}
              >
                {t('提交申请')}
              </Button>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <InputNumber
                value={form.amount}
                min={0.01}
                max={summary?.available_amount || undefined}
                precision={2}
                step={0.01}
                hideButtons
                style={{ width: '100%' }}
                placeholder={t('开票金额')}
                onChange={(value) => handleFieldChange('amount', value)}
              />
              <Input
                value={form.invoice_title}
                placeholder={t('发票抬头')}
                onChange={(value) => handleFieldChange('invoice_title', value)}
              />
              <Input
                value={form.tax_number}
                placeholder={t('税号')}
                onChange={(value) => handleFieldChange('tax_number', value)}
              />
              <Input
                value={form.email}
                placeholder={t('邮箱')}
                onChange={(value) => handleFieldChange('email', value)}
              />
            </div>

            <TextArea
              value={form.remark}
              maxCount={2000}
              rows={3}
              placeholder={t('备注')}
              onChange={(value) => handleFieldChange('remark', value)}
            />

            {(summary?.available_amount || 0) <= 0 ? (
              <Text type='danger' className='text-sm'>
                {t('当前没有可申请开票的余额')}
              </Text>
            ) : (
              <Text type='tertiary' className='text-sm'>
                {t('本次最多可申请')} {formatMoney(summary?.available_amount || 0)}
              </Text>
            )}
          </Space>
        </Card>

        <Card className='!rounded-xl border-0 shadow-sm'>
          <Space vertical style={{ width: '100%' }} spacing='medium'>
            <div className='flex items-center justify-between'>
              <Text strong>{t('开票记录')}</Text>
              <Text type='tertiary'>
                {t('共 {{count}} 条', { count: total || 0 })}
              </Text>
            </div>

            <CardTable
              columns={columns}
              dataSource={invoices}
              rowKey='id'
              loading={loading}
              pagination={{
                currentPage: page,
                pageSize: pageSize,
                total: total,
                pageSizeOpts: [10, 20, 50],
                showSizeChanger: true,
                onPageChange: setPage,
                onPageSizeChange: (currentPageSize) => {
                  setPageSize(currentPageSize);
                  setPage(1);
                },
              }}
              empty={
                <Empty
                  image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
                  darkModeImage={
                    <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
                  }
                  description={t('暂无开票申请')}
                  style={{ padding: 30 }}
                />
              }
              size='small'
            />
          </Space>
        </Card>
      </div>
    </Modal>
  );
};

export default InvoiceModal;
