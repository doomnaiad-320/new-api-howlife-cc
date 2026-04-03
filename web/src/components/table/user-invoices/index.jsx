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

import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Modal,
  Space,
  Tag,
  TextArea,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API, timestamp2string } from '../../../helpers';
import CardPro from '../../common/ui/CardPro';
import CardTable from '../../common/ui/CardTable';
import { UserContext } from '../../../context/User';
import { useIsMobile } from '../../../hooks/common/useIsMobile';
import { createCardProPagination } from '../../../helpers/utils';

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

const SUMMARY_CARD_STYLES = {
  available: {
    wrapper: 'border-emerald-100 bg-emerald-50/80',
    value: 'text-emerald-700',
    tagColor: 'green',
  },
  eligible: {
    wrapper: 'border-sky-100 bg-sky-50/80',
    value: 'text-sky-700',
    tagColor: 'blue',
  },
  reserved: {
    wrapper: 'border-amber-100 bg-amber-50/80',
    value: 'text-amber-700',
    tagColor: 'orange',
  },
};

const SummaryCard = ({ label, value, hint, badge, tone = 'eligible' }) => {
  const style = SUMMARY_CARD_STYLES[tone] || SUMMARY_CARD_STYLES.eligible;

  return (
    <div className={`rounded-2xl border px-5 py-4 ${style.wrapper}`}>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-xs font-medium uppercase tracking-[0.18em] text-slate-500'>
            {label}
          </div>
          <div className={`mt-3 text-3xl font-semibold ${style.value}`}>
            {formatMoney(value)}
          </div>
        </div>
        {badge ? (
          <Tag color={style.tagColor} shape='circle' size='small'>
            {badge}
          </Tag>
        ) : null}
      </div>
      {hint ? <div className='mt-3 text-xs leading-5 text-slate-500'>{hint}</div> : null}
    </div>
  );
};

const FieldGroup = ({ label, hint, required = false, action = null, children }) => (
  <div className='space-y-2'>
    <div className='flex items-center justify-between gap-3'>
      <div className='flex items-center gap-2'>
        <span className='text-sm font-medium text-slate-900'>{label}</span>
        {required ? (
          <span className='rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600'>
            必填
          </span>
        ) : null}
      </div>
      {action ? <div className='shrink-0'>{action}</div> : null}
    </div>
    {children}
    {hint ? <div className='text-xs leading-5 text-slate-500'>{hint}</div> : null}
  </div>
);

const GuideBlock = ({ title, description }) => (
  <div className='rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4'>
    <div className='text-sm font-semibold text-slate-900'>{title}</div>
    <div className='mt-1 text-xs leading-5 text-slate-500'>{description}</div>
  </div>
);

const StatusBlock = ({ color, label, description, className }) => (
  <div className={`rounded-xl border px-4 py-3 ${className}`}>
    <div className='flex items-center gap-2'>
      <Tag color={color} shape='circle' size='small'>
        {label}
      </Tag>
      <span className='text-sm font-medium text-slate-900'>{description}</span>
    </div>
  </div>
);

const DESKTOP_AMOUNT_PILL_STYLES = {
  available: {
    wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    value: 'text-emerald-700',
  },
  eligible: {
    wrapper: 'border-sky-200 bg-sky-50 text-sky-700',
    value: 'text-sky-700',
  },
};

const DesktopAmountPill = ({ label, value, tone = 'available' }) => {
  const style = DESKTOP_AMOUNT_PILL_STYLES[tone] || DESKTOP_AMOUNT_PILL_STYLES.available;

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 ${style.wrapper}`}
    >
      <span className='text-xs font-medium'>{label}</span>
      <span className={`text-sm font-semibold ${style.value}`}>{value}</span>
    </div>
  );
};

const InvoiceDescription = ({
  availableAmount,
  eligibleAmount,
  hasAvailableAmount,
  onApply,
  t,
}) => {
  return (
    <div className='w-full'>
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div className='min-w-0'>
          <div className='flex items-center text-blue-500'>
            <FileText size={16} className='mr-2' />
            <Text>{t('发票申请')}</Text>
          </div>
          <Text type='tertiary' className='mt-1 block text-xs'>
            {t('累计可开票金额 {{amount}}', {
              amount: formatMoney(eligibleAmount),
            })}
          </Text>
        </div>

        <div className='flex flex-wrap items-center justify-end gap-3 md:shrink-0'>
          <DesktopAmountPill
            label={t('可申请金额')}
            value={formatMoney(availableAmount)}
            tone='available'
          />
          <Button
            type='primary'
            theme='solid'
            size='small'
            disabled={!hasAvailableAmount}
            onClick={onApply}
          >
            {t('申请开票')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const UserInvoicesPage = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const userContextValue = useContext(UserContext);
  const userState = Array.isArray(userContextValue)
    ? userContextValue[0]
    : userContextValue?.state;
  const defaultEmail = userState?.user?.email || '';

  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(createInitialForm(defaultEmail));
  const availableAmount = Number(summary?.available_amount || 0);
  const eligibleAmount = Number(summary?.eligible_amount || 0);
  const reservedAmount = Number(summary?.reserved_amount || 0);
  const hasAvailableAmount = availableAmount > 0;

  const loadSummary = async () => {
    const res = await API.get('/api/user/invoice/summary');
    const { success, message, data } = res.data;
    if (!success) {
      throw new Error(message || t('加载可开票金额失败'));
    }
    setSummary(data || null);
  };

  const loadInvoices = async (currentPage = page, currentPageSize = pageSize) => {
    const res = await API.get(
      `/api/user/invoice/self?p=${currentPage}&page_size=${currentPageSize}`,
    );
    const { success, message, data } = res.data;
    if (!success) {
      throw new Error(message || t('加载开票记录失败'));
    }
    setItems(data?.items || []);
    setTotal(data?.total || 0);
  };

  const loadData = async (currentPage = page, currentPageSize = pageSize) => {
    setLoading(true);
    try {
      await Promise.all([
        loadSummary(),
        loadInvoices(currentPage, currentPageSize),
      ]);
    } catch (error) {
      Toast.error({ content: error.message || t('加载失败') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(page, pageSize);
  }, [page, pageSize]);

  useEffect(() => {
    if (!defaultEmail) return;
    setForm((prev) => ({
      ...prev,
      email: prev.email || defaultEmail,
    }));
  }, [defaultEmail]);

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
    if ((summary?.available_amount || 0) <= 0) {
      Toast.warning({ content: t('当前没有可申请开票的余额') });
      return;
    }

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
      setShowApplyModal(false);
      setPage(1);
      await Promise.all([loadSummary(), loadInvoices(1, pageSize)]);
    } catch (error) {
      Toast.error({ content: error.message || t('提交失败') });
    } finally {
      setSubmitLoading(false);
    }
  };

  const mobileColumns = useMemo(
    () => [
      {
        title: t('金额'),
        dataIndex: 'amount',
        key: 'amount',
        width: 108,
        render: (value) => <Text strong>{formatMoney(value)}</Text>,
      },
      {
        title: t('发票抬头'),
        dataIndex: 'invoice_title',
        key: 'invoice_title',
        width: 156,
        render: (value) => (
          <div className='max-w-[156px] truncate text-[var(--semi-color-text-0)]' title={value}>
            {value || '-'}
          </div>
        ),
      },
      {
        title: t('税号'),
        dataIndex: 'tax_number',
        key: 'tax_number',
        width: 156,
        render: (value) => (
          <div className='max-w-[156px] truncate text-[var(--semi-color-text-1)]' title={value}>
            {value || '-'}
          </div>
        ),
      },
      {
        title: t('邮箱'),
        dataIndex: 'email',
        key: 'email',
        width: 176,
        render: (value) => (
          <div className='max-w-[176px] truncate text-[var(--semi-color-text-1)]' title={value}>
            {value || '-'}
          </div>
        ),
      },
      {
        title: t('状态'),
        dataIndex: 'status',
        key: 'status',
        width: 96,
        render: (status) => {
          const config = STATUS_CONFIG[status] || {
            color: 'grey',
            label: status || '-',
          };
          return (
            <Tag color={config.color} shape='circle' size='small'>
              {t(config.label)}
            </Tag>
          );
        },
      },
      {
        title: t('拒绝原因'),
        dataIndex: 'reject_reason',
        key: 'reject_reason',
        width: 176,
        render: (value) => (
          <div className='max-w-[176px] truncate text-[var(--semi-color-text-1)]' title={value}>
            {value || '-'}
          </div>
        ),
      },
      {
        title: t('申请时间'),
        dataIndex: 'created_at',
        key: 'created_at',
        width: 152,
        render: (value) => (
          <span className='text-xs text-[var(--semi-color-text-2)]'>
            {value ? timestamp2string(value) : '-'}
          </span>
        ),
      },
      {
        title: t('处理时间'),
        dataIndex: 'processed_at',
        key: 'processed_at',
        width: 152,
        render: (value) => (
          <span className='text-xs text-[var(--semi-color-text-2)]'>
            {value ? timestamp2string(value) : '-'}
          </span>
        ),
      },
    ],
    [t],
  );

  const desktopColumns = useMemo(
    () => [
      {
        title: t('金额'),
        dataIndex: 'amount',
        key: 'amount',
        width: 108,
        render: (value) => <Text strong>{formatMoney(value)}</Text>,
      },
      {
        title: t('发票抬头'),
        dataIndex: 'invoice_title',
        key: 'invoice_title',
        width: 140,
        render: (value) => (
          <div className='max-w-[140px] truncate text-[var(--semi-color-text-0)]' title={value}>
            {value || '-'}
          </div>
        ),
      },
      {
        title: t('税号'),
        dataIndex: 'tax_number',
        key: 'tax_number',
        width: 140,
        render: (value) => (
          <div className='max-w-[140px] truncate text-[var(--semi-color-text-1)]' title={value}>
            {value || '-'}
          </div>
        ),
      },
      {
        title: t('邮箱'),
        dataIndex: 'email',
        key: 'email',
        width: 160,
        render: (value) => (
          <div className='max-w-[160px] truncate text-[var(--semi-color-text-1)]' title={value}>
            {value || '-'}
          </div>
        ),
      },
      {
        title: t('备注'),
        dataIndex: 'remark',
        key: 'remark',
        width: 160,
        render: (value) => (
          <div className='max-w-[160px] truncate text-[var(--semi-color-text-1)]' title={value}>
            {value || '-'}
          </div>
        ),
      },
      {
        title: t('状态'),
        dataIndex: 'status',
        key: 'status',
        width: 96,
        render: (status) => {
          const config = STATUS_CONFIG[status] || {
            color: 'grey',
            label: status || '-',
          };

          return (
            <Tag color={config.color} shape='circle' size='small'>
              {t(config.label)}
            </Tag>
          );
        },
      },
      {
        title: t('拒绝原因'),
        dataIndex: 'reject_reason',
        key: 'reject_reason',
        width: 150,
        render: (value) => (
          <div className='max-w-[150px] truncate text-[var(--semi-color-text-1)]' title={value}>
            {value || '-'}
          </div>
        ),
      },
      {
        title: t('申请时间'),
        dataIndex: 'created_at',
        key: 'created_at',
        width: 148,
        render: (value) => (
          <span className='text-xs text-[var(--semi-color-text-2)]'>
            {value ? timestamp2string(value) : '-'}
          </span>
        ),
      },
      {
        title: t('处理时间'),
        dataIndex: 'processed_at',
        key: 'processed_at',
        width: 148,
        render: (value) => (
          <span className='text-xs text-[var(--semi-color-text-2)]'>
            {value ? timestamp2string(value) : '-'}
          </span>
        ),
      },
    ],
    [t],
  );

  const guideItems = [
    {
      title: t('开票范围'),
      description: t('仅成功充值订单计入可开票金额，订阅订单不参与开票计算。'),
    },
    {
      title: t('信息校验'),
      description: t('请确保抬头、税号和邮箱真实有效，避免因信息错误导致拒绝。'),
    },
    {
      title: t('提交结果'),
      description: t('提交后申请会进入待开票状态，并在日志中持续更新处理进度。'),
    },
  ];

  const amountFieldAction = hasAvailableAmount ? (
    <Button
      type='tertiary'
      theme='borderless'
      size='small'
      onClick={() => handleFieldChange('amount', availableAmount)}
      style={{ paddingLeft: 0, paddingRight: 0 }}
    >
      {t('填入可申请金额')}
    </Button>
  ) : null;

  const formFields = (
    <>
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <FieldGroup
          label={t('开票金额')}
          hint={t('本次申请金额不能超过当前可开票金额')}
          required
          action={amountFieldAction}
        >
          <InputNumber
            value={form.amount}
            min={0.01}
            max={availableAmount || undefined}
            precision={2}
            step={0.01}
            hideButtons
            style={{ width: '100%' }}
            placeholder={t('请输入开票金额')}
            onChange={(value) => handleFieldChange('amount', value)}
          />
        </FieldGroup>

        <FieldGroup
          label={t('发票抬头')}
          hint={t('请填写与开票主体一致的公司或个人名称')}
          required
        >
          <Input
            value={form.invoice_title}
            placeholder={t('请输入发票抬头')}
            onChange={(value) => handleFieldChange('invoice_title', value)}
          />
        </FieldGroup>

        <FieldGroup
          label={t('税号')}
          hint={t('企业请填写统一社会信用代码或纳税人识别号')}
          required
        >
          <Input
            value={form.tax_number}
            placeholder={t('请输入税号')}
            onChange={(value) => handleFieldChange('tax_number', value)}
          />
        </FieldGroup>

        <FieldGroup
          label={t('邮箱')}
          hint={t('用于接收开票结果或电子发票信息')}
          required
        >
          <Input
            value={form.email}
            placeholder={t('请输入邮箱')}
            onChange={(value) => handleFieldChange('email', value)}
          />
        </FieldGroup>
      </div>

      <FieldGroup
        label={t('备注')}
        hint={t('可补充开票说明、联系人或特殊处理要求')}
      >
        <TextArea
          value={form.remark}
          maxCount={2000}
          rows={4}
          placeholder={t('请输入备注')}
          onChange={(value) => handleFieldChange('remark', value)}
        />
      </FieldGroup>
    </>
  );

  const handlePageSizeChange = (currentPageSize) => {
    setPageSize(currentPageSize);
    setPage(1);
  };

  const logsPaginationArea = createCardProPagination({
    currentPage: page,
    pageSize,
    total,
    onPageChange: setPage,
    onPageSizeChange: handlePageSizeChange,
    isMobile,
    t,
  });

  const logsTablePagination = {
    currentPage: page,
    pageSize,
    total,
    pageSizeOpts: [10, 20, 50],
    showSizeChanger: true,
    onPageChange: setPage,
    onPageSizeChange: handlePageSizeChange,
  };

  const renderLogsTable = () => (
    <CardTable
      columns={isMobile ? mobileColumns : desktopColumns}
      dataSource={items}
      rowKey='id'
      loading={loading}
      hidePagination={!isMobile}
      pagination={logsTablePagination}
      scroll={isMobile ? undefined : { x: '100%' }}
      className='rounded-xl overflow-hidden'
      empty={
        <Empty
          image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
          darkModeImage={
            <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
          }
          description={t('暂无开票日志')}
          style={{ padding: 24 }}
        />
      }
      size='small'
    />
  );

  const logDescriptionArea = (
    <div className='flex items-center justify-between gap-3'>
      <div>
        <Text strong>{t('开票日志')}</Text>
        <div className='text-xs text-[var(--semi-color-text-2)] mt-1'>
          {t('提交后可在这里查看状态、拒绝原因和处理时间')}
        </div>
      </div>
      <Tag color='blue' shape='circle'>
        {t('共 {{count}} 条', { count: total || 0 })}
      </Tag>
    </div>
  );

  const logsSection = (
    <CardPro
      type='type1'
      descriptionArea={logDescriptionArea}
      paginationArea={logsPaginationArea}
      t={t}
    >
      {renderLogsTable()}
    </CardPro>
  );

  const desktopLogDescriptionArea = (
    <InvoiceDescription
      availableAmount={availableAmount}
      eligibleAmount={eligibleAmount}
      hasAvailableAmount={hasAvailableAmount}
      onApply={() => setShowApplyModal(true)}
      t={t}
    />
  );

  const desktopLogsSection = (
    <CardPro
      type='type1'
      descriptionArea={desktopLogDescriptionArea}
      paginationArea={logsPaginationArea}
      t={t}
    >
      {renderLogsTable()}
    </CardPro>
  );

  const desktopApplyModal = (
    <Modal
      title={t('申请开票')}
      visible={showApplyModal}
      onCancel={() => setShowApplyModal(false)}
      footer={null}
      size='large'
    >
      <div className='space-y-5'>
        <div
          className='rounded-xl border px-4 py-3'
          style={{
            background: 'var(--semi-color-fill-0)',
            borderColor: 'var(--semi-color-border)',
          }}
        >
          <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
            <div>
              <div className='text-sm font-semibold text-[var(--semi-color-text-0)]'>
                {t('填写发票信息')}
              </div>
              <div className='mt-1 text-xs leading-5 text-[var(--semi-color-text-2)]'>
                {t('仅成功充值订单支持开票，请确认抬头、税号和邮箱信息准确。')}
              </div>
            </div>
            <Tag color={hasAvailableAmount ? 'green' : 'grey'} shape='circle'>
              {t('可申请 {{amount}}', { amount: formatMoney(availableAmount) })}
            </Tag>
          </div>

          <div className='mt-2 space-y-1 text-xs leading-5 text-[var(--semi-color-text-2)]'>
            <div>{t('提交后日志状态会更新为待开票、已开票或已拒绝。')}</div>
            <div>{t('已占用开票金额包含待开票和已开票状态的金额。')}</div>
          </div>
        </div>

        {formFields}

        <div className='flex justify-end gap-2'>
          <Button theme='outline' onClick={() => setShowApplyModal(false)}>
            {t('取消')}
          </Button>
          <Button
            type='primary'
            theme='solid'
            loading={submitLoading}
            disabled={!hasAvailableAmount}
            onClick={handleSubmit}
          >
            {t('提交开票申请')}
          </Button>
        </div>
      </div>
    </Modal>
  );

  if (isMobile) {
    return (
      <div className='space-y-5'>
        <Card className='!rounded-[28px] border-0 shadow-sm overflow-hidden'>
          <div className='relative overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#eff6ff_48%,#ecfdf5_100%)] px-6 py-6'>
            <div className='absolute -right-12 -top-10 h-40 w-40 rounded-full bg-white/50 blur-3xl' />
            <div className='relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between'>
              <div className='max-w-2xl'>
                <Tag color='blue' shape='circle' size='small'>
                  {t('增值税发票')}
                </Tag>
                <div className='mt-4 text-[28px] font-semibold leading-tight text-slate-900'>
                  {t('发票申请')}
                </div>
                <div className='mt-2 max-w-2xl text-sm leading-6 text-slate-600'>
                  {t(
                    '当前页面只支持增值税发票申请，可开票金额仅统计成功充值订单，不包含订阅订单。提交后可在下方开票日志中跟踪处理进度。',
                  )}
                </div>
              </div>
              <div className='rounded-2xl border border-white/70 bg-white/80 px-5 py-4 backdrop-blur'>
                <div className='text-xs font-medium uppercase tracking-[0.16em] text-slate-500'>
                  {t('当前可申请')}
                </div>
                <div className='mt-2 text-3xl font-semibold text-slate-900'>
                  {formatMoney(availableAmount)}
                </div>
                <div className='mt-1 text-xs text-slate-500'>
                  {t('仅统计成功充值，已扣除待开票和已开票金额')}
                </div>
              </div>
            </div>

            <div className='relative mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3'>
              <SummaryCard
                label={t('当前可开票金额')}
                value={availableAmount}
                hint={t('用户现在还能继续申请的金额')}
                badge={t('可申请')}
                tone='available'
              />
              <SummaryCard
                label={t('累计可开票金额')}
                value={eligibleAmount}
                hint={t('仅统计成功充值订单的累计金额')}
                badge={t('累计')}
                tone='eligible'
              />
              <SummaryCard
                label={t('已占用开票金额')}
                value={reservedAmount}
                hint={t('包含待开票和已开票状态的申请金额')}
                badge={t('占用中')}
                tone='reserved'
              />
            </div>
          </div>
        </Card>

        <div className='grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_340px]'>
          <Card className='!rounded-2xl border-0 shadow-sm'>
            <Space vertical style={{ width: '100%' }} spacing='large'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <Text strong className='text-lg'>
                    {t('申请入口')}
                  </Text>
                  <div className='mt-1 text-sm leading-6 text-slate-500'>
                    {t('点击按钮后填写开票金额、抬头、税号、邮箱和备注信息。')}
                  </div>
                </div>
                <Tag color={hasAvailableAmount ? 'green' : 'grey'} shape='circle'>
                  {t('可申请 {{amount}}', { amount: formatMoney(availableAmount) })}
                </Tag>
              </div>

              <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <GuideBlock
                  title={t('填写内容')}
                  description={t('需要填写开票金额、发票抬头、税号、邮箱以及备注信息。')}
                />
                <GuideBlock
                  title={t('提交结果')}
                  description={t('提交后申请会进入待开票状态，并在下方日志中持续更新。')}
                />
              </div>

              <div
                className={`flex flex-col gap-4 rounded-2xl border px-4 py-4 xl:flex-row xl:items-center xl:justify-between ${
                  hasAvailableAmount
                    ? 'border-emerald-100 bg-emerald-50/80'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div>
                  <div className='text-sm font-semibold text-slate-900'>
                    {hasAvailableAmount
                      ? t('提交后将进入待开票状态')
                      : t('当前暂时没有可申请的开票金额')}
                  </div>
                  <div className='mt-1 text-xs leading-5 text-slate-500'>
                    {hasAvailableAmount
                      ? t('后台处理后会更新为已开票或已拒绝，拒绝时会显示原因。')
                      : t('先完成成功充值后，可开票金额才会更新到这里。')}
                  </div>
                </div>
                <Button
                  type='primary'
                  theme='solid'
                  size='large'
                  onClick={() => setShowApplyModal(true)}
                  style={{ width: '100%' }}
                >
                  {t('填写开票信息')}
                </Button>
              </div>
            </Space>
          </Card>

          <div className='space-y-5'>
            <Card className='!rounded-2xl border-0 shadow-sm'>
              <Space vertical style={{ width: '100%' }} spacing='medium'>
                <div>
                  <Text strong>{t('开票须知')}</Text>
                  <div className='text-xs text-[var(--semi-color-text-2)] mt-1'>
                    {t('申请前请先确认开票范围和信息准确性')}
                  </div>
                </div>

                {guideItems.map((item) => (
                  <GuideBlock
                    key={item.title}
                    title={item.title}
                    description={item.description}
                  />
                ))}
              </Space>
            </Card>

            <Card className='!rounded-2xl border-0 shadow-sm'>
              <Space vertical style={{ width: '100%' }} spacing='medium'>
                <div>
                  <Text strong>{t('状态说明')}</Text>
                  <div className='text-xs text-[var(--semi-color-text-2)] mt-1'>
                    {t('日志中的状态会按后台处理结果自动更新')}
                  </div>
                </div>

                <div className='space-y-3'>
                  <StatusBlock
                    color='orange'
                    label={t('待开票')}
                    description={t('申请已提交，等待后台处理')}
                    className='border-orange-100 bg-orange-50/80'
                  />
                  <StatusBlock
                    color='green'
                    label={t('已开票')}
                    description={t('后台已完成开票，处理时间会记录在日志中')}
                    className='border-emerald-100 bg-emerald-50/80'
                  />
                  <StatusBlock
                    color='red'
                    label={t('已拒绝')}
                    description={t('后台拒绝申请时，会在日志里展示拒绝原因')}
                    className='border-rose-100 bg-rose-50/80'
                  />
                </div>
              </Space>
            </Card>
          </div>
        </div>

        {logsSection}

        <Modal
          title={t('填写开票信息')}
          visible={showApplyModal}
          onCancel={() => setShowApplyModal(false)}
          footer={null}
          size='full-width'
        >
          <div className='space-y-5'>
            <div className='rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-4'>
              <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
                <div>
                  <div className='text-sm font-semibold text-slate-900'>
                    {t('请确认本次开票信息')}
                  </div>
                  <div className='mt-1 text-xs leading-5 text-slate-500'>
                    {t('仅成功充值订单支持开票，订阅订单不计入可开票金额。')}
                  </div>
                </div>
                <Tag color={hasAvailableAmount ? 'green' : 'grey'} shape='circle'>
                  {t('可申请 {{amount}}', { amount: formatMoney(availableAmount) })}
                </Tag>
              </div>
            </div>

            {formFields}

            <div
              className={`flex flex-col gap-4 rounded-2xl border px-4 py-4 md:flex-row md:items-center md:justify-between ${
                hasAvailableAmount
                  ? 'border-emerald-100 bg-emerald-50/80'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div>
                <div className='text-sm font-semibold text-slate-900'>
                  {hasAvailableAmount
                    ? t('确认后提交本次开票申请')
                    : t('当前暂时没有可申请的开票金额')}
                </div>
                <div className='mt-1 text-xs leading-5 text-slate-500'>
                  {hasAvailableAmount
                    ? t('提交后会进入待开票状态，后台处理结果会同步到开票日志。')
                    : t('先完成成功充值后，可开票金额才会更新到这里。')}
                </div>
              </div>
              <div className='flex gap-2'>
                <Button theme='outline' onClick={() => setShowApplyModal(false)}>
                  {t('取消')}
                </Button>
                <Button
                  type='primary'
                  theme='solid'
                  size='large'
                  loading={submitLoading}
                  disabled={!hasAvailableAmount}
                  onClick={handleSubmit}
                >
                  {t('提交开票申请')}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {desktopLogsSection}
      {desktopApplyModal}
    </div>
  );
};

export default UserInvoicesPage;
