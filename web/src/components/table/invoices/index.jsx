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
  Button,
  Empty,
  Input,
  Modal,
  Select,
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
import { IconSearch } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import CardPro from '../../common/ui/CardPro';
import CardTable from '../../common/ui/CardTable';
import { createCardProPagination } from '../../../helpers/utils';
import { API, timestamp2string } from '../../../helpers';
import { useIsMobile } from '../../../hooks/common/useIsMobile';

const { Text } = Typography;

const STATUS_CONFIG = {
  pending: { color: 'orange', label: '待开票' },
  approved: { color: 'green', label: '已开票' },
  rejected: { color: 'red', label: '已拒绝' },
};

const formatMoney = (value) => `¥${Number(value || 0).toFixed(2)}`;

const InvoicesPage = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [status, setStatus] = useState('');
  const [actionVisible, setActionVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [targetStatus, setTargetStatus] = useState('approved');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        p: String(page),
        page_size: String(pageSize),
      });
      if (keyword) {
        params.set('keyword', keyword);
      }
      if (status) {
        params.set('status', status);
      }

      const res = await API.get(`/api/user/invoice?${params.toString()}`);
      const { success, message, data } = res.data;
      if (!success) {
        Toast.error({ content: message || t('加载开票申请失败') });
        return;
      }

      setItems(data?.items || []);
      setTotal(data?.total || 0);
    } catch (error) {
      Toast.error({ content: t('加载开票申请失败') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [page, pageSize, keyword, status]);

  const openActionModal = (record, nextStatus) => {
    setSelectedInvoice(record);
    setTargetStatus(nextStatus);
    setRejectReason(nextStatus === 'rejected' ? record?.reject_reason || '' : '');
    setActionVisible(true);
  };

  const closeActionModal = () => {
    setActionVisible(false);
    setSelectedInvoice(null);
    setTargetStatus('approved');
    setRejectReason('');
  };

  const handleSubmitAction = async () => {
    if (!selectedInvoice?.id) return;
    if (targetStatus === 'rejected' && !String(rejectReason || '').trim()) {
      Toast.error({ content: t('请输入拒绝原因') });
      return;
    }

    setActionLoading(true);
    try {
      const res = await API.put(`/api/user/invoice/${selectedInvoice.id}/status`, {
        status: targetStatus,
        reject_reason: rejectReason,
      });
      const { success, message } = res.data;
      if (!success) {
        Toast.error({ content: message || t('更新失败') });
        return;
      }
      Toast.success({
        content:
          targetStatus === 'approved'
            ? t('已标记为已开票')
            : t('已标记为已拒绝'),
      });
      closeActionModal();
      loadInvoices();
    } catch (error) {
      Toast.error({ content: t('更新失败') });
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: t('申请 ID'),
        dataIndex: 'id',
        key: 'id',
      },
      {
        title: t('用户'),
        dataIndex: 'username',
        key: 'username',
        render: (value) => value || '-',
      },
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
        render: (value) => {
          const config = STATUS_CONFIG[value] || {
            color: 'grey',
            label: value || '-',
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
        title: t('备注'),
        dataIndex: 'remark',
        key: 'remark',
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
      {
        title: t('处理人'),
        dataIndex: 'processed_by_username',
        key: 'processed_by_username',
        render: (value) => value || '-',
      },
      {
        title: t('操作'),
        key: 'operate',
        render: (_, record) =>
          record?.status === 'pending' ? (
            <Space wrap>
              <Button
                size='small'
                type='primary'
                theme='outline'
                onClick={() => openActionModal(record, 'approved')}
              >
                {t('标记已开票')}
              </Button>
              <Button
                size='small'
                type='danger'
                theme='outline'
                onClick={() => openActionModal(record, 'rejected')}
              >
                {t('拒绝')}
              </Button>
            </Space>
          ) : (
            '-'
          ),
      },
    ],
    [t],
  );

  const statsArea = (
    <div className='flex items-center justify-between gap-3'>
      <div>
        <Text strong>{t('发票申请')}</Text>
        <div className='text-xs text-[var(--semi-color-text-2)] mt-1'>
          {t('审核用户提交的发票申请并更新开票状态')}
        </div>
      </div>
      <Tag color='blue' shape='circle'>
        {t('共 {{count}} 条', { count: total })}
      </Tag>
    </div>
  );

  const searchArea = (
    <div className='flex flex-col md:flex-row gap-3'>
      <Input
        prefix={<IconSearch />}
        placeholder={t('搜索用户名 / 抬头 / 税号 / 邮箱')}
        value={keywordInput}
        onChange={setKeywordInput}
        onEnterPress={() => {
          setPage(1);
          setKeyword(keywordInput.trim());
        }}
        showClear
      />
      <Select
        value={status}
        style={{ minWidth: 180 }}
        optionList={[
          { label: t('全部状态'), value: '' },
          { label: t('待开票'), value: 'pending' },
          { label: t('已开票'), value: 'approved' },
          { label: t('已拒绝'), value: 'rejected' },
        ]}
        onChange={(value) => {
          setPage(1);
          setStatus(value || '');
        }}
      />
      <Space>
        <Button
          type='primary'
          theme='solid'
          onClick={() => {
            setPage(1);
            setKeyword(keywordInput.trim());
          }}
        >
          {t('查询')}
        </Button>
        <Button
          theme='outline'
          onClick={() => {
            setKeywordInput('');
            setKeyword('');
            setStatus('');
            setPage(1);
          }}
        >
          {t('重置')}
        </Button>
      </Space>
    </div>
  );

  return (
    <>
      <Modal
        title={
          targetStatus === 'approved' ? t('确认标记为已开票') : t('确认拒绝申请')
        }
        visible={actionVisible}
        onCancel={closeActionModal}
        onOk={handleSubmitAction}
        confirmLoading={actionLoading}
      >
        <div className='space-y-3'>
          <Text>
            {selectedInvoice
              ? t('申请 #{{id}}，金额 {{amount}}', {
                  id: selectedInvoice.id,
                  amount: formatMoney(selectedInvoice.amount),
                })
              : ''}
          </Text>

          {targetStatus === 'rejected' ? (
            <TextArea
              value={rejectReason}
              rows={4}
              maxCount={2000}
              placeholder={t('请输入拒绝原因')}
              onChange={setRejectReason}
            />
          ) : (
            <Text type='tertiary'>{t('确认后用户侧状态将更新为已开票。')}</Text>
          )}
        </div>
      </Modal>

      <CardPro
        type='type2'
        statsArea={statsArea}
        searchArea={searchArea}
        paginationArea={
          isMobile
            ? null
            : createCardProPagination({
                currentPage: page,
                pageSize: pageSize,
                total,
                onPageChange: setPage,
                onPageSizeChange: (currentPageSize) => {
                  setPageSize(currentPageSize);
                  setPage(1);
                },
                isMobile,
                t,
              })
        }
        t={t}
      >
        <CardTable
          columns={columns}
          dataSource={items}
          rowKey='id'
          loading={loading}
          hidePagination={!isMobile}
          pagination={{
            currentPage: page,
            pageSize: pageSize,
            total,
            pageSizeOpts: [10, 20, 50, 100],
            showSizeChanger: true,
            onPageChange: setPage,
            onPageSizeChange: (currentPageSize) => {
              setPageSize(currentPageSize);
              setPage(1);
            },
          }}
          scroll={isMobile ? undefined : { x: 'max-content' }}
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
          size='middle'
        />
      </CardPro>
    </>
  );
};

export default InvoicesPage;
