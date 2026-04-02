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
  Badge,
  Button,
  Empty,
  Input,
  Space,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { IconSearch } from '@douyinfe/semi-icons';
import { Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CardPro from '../../common/ui/CardPro';
import CardTable from '../../common/ui/CardTable';
import { createCardProPagination } from '../../../helpers/utils';
import { API, timestamp2string } from '../../../helpers';
import { useIsMobile } from '../../../hooks/common/useIsMobile';

const { Text } = Typography;

const STATUS_CONFIG = {
  success: { type: 'success', label: '成功' },
  pending: { type: 'warning', label: '待支付' },
  expired: { type: 'danger', label: '已过期' },
};

const PAYMENT_METHOD_MAP = {
  stripe: 'Stripe',
  creem: 'Creem',
  alipay: '支付宝',
  wxpay: '微信',
};

const isSubscriptionTopup = (record) => {
  const tradeNo = String(record?.trade_no || '').toLowerCase();
  return Number(record?.amount || 0) === 0 && tradeNo.startsWith('sub');
};

const BillingPage = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  const loadBills = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        p: String(page),
        page_size: String(pageSize),
      });
      if (keyword) {
        params.set('keyword', keyword);
      }

      const res = await API.get(`/api/user/topup/self?${params.toString()}`);
      const { success, message, data } = res.data;
      if (!success) {
        Toast.error({ content: message || t('加载账单失败') });
        return;
      }

      setItems(data?.items || []);
      setTotal(data?.total || 0);
    } catch (error) {
      Toast.error({ content: t('加载账单失败') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, [page, pageSize, keyword]);

  const columns = useMemo(
    () => [
      {
        title: t('订单号'),
        dataIndex: 'trade_no',
        key: 'trade_no',
        render: (value) => <Text copyable>{value}</Text>,
      },
      {
        title: t('支付方式'),
        dataIndex: 'payment_method',
        key: 'payment_method',
        render: (value) => t(PAYMENT_METHOD_MAP[value] || value || '-'),
      },
      {
        title: t('充值额度'),
        dataIndex: 'amount',
        key: 'amount',
        render: (value, record) => {
          if (isSubscriptionTopup(record)) {
            return (
              <Tag color='purple' shape='circle' size='small'>
                {t('订阅套餐')}
              </Tag>
            );
          }
          return (
            <span className='flex items-center gap-1'>
              <Coins size={16} />
              <Text>{value}</Text>
            </span>
          );
        },
      },
      {
        title: t('支付金额'),
        dataIndex: 'money',
        key: 'money',
        render: (value) => <Text type='danger'>¥{Number(value || 0).toFixed(2)}</Text>,
      },
      {
        title: t('状态'),
        dataIndex: 'status',
        key: 'status',
        render: (value) => {
          const config = STATUS_CONFIG[value] || {
            type: 'primary',
            label: value || '-',
          };
          return (
            <span className='flex items-center gap-2'>
              <Badge dot type={config.type} />
              <span>{t(config.label)}</span>
            </span>
          );
        },
      },
      {
        title: t('创建时间'),
        dataIndex: 'create_time',
        key: 'create_time',
        render: (value) => (value ? timestamp2string(value) : '-'),
      },
    ],
    [t],
  );

  const descriptionArea = (
    <div className='flex items-center justify-between gap-3'>
      <div>
        <Text strong>{t('充值账单')}</Text>
        <div className='text-xs text-[var(--semi-color-text-2)] mt-1'>
          {t('查看充值与订阅支付记录')}
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
        placeholder={t('搜索订单号')}
        value={keywordInput}
        onChange={setKeywordInput}
        onEnterPress={() => {
          setPage(1);
          setKeyword(keywordInput.trim());
        }}
        showClear
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
            setPage(1);
          }}
        >
          {t('重置')}
        </Button>
      </Space>
    </div>
  );

  return (
    <CardPro
      type='type1'
      descriptionArea={descriptionArea}
      searchArea={searchArea}
      paginationArea={createCardProPagination({
        currentPage: page,
        pageSize,
        total,
        onPageChange: setPage,
        onPageSizeChange: (currentPageSize) => {
          setPageSize(currentPageSize);
          setPage(1);
        },
        isMobile,
        t,
      })}
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
          pageSize,
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
            description={t('暂无充值记录')}
            style={{ padding: 30 }}
          />
        }
        size='middle'
      />
    </CardPro>
  );
};

export default BillingPage;
