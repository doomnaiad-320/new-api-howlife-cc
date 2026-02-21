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
import { Button, Card, Empty, Space, Tag, Typography } from '@douyinfe/semi-ui';
import { Bell, ChevronRight, Gift, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API, renderQuota } from '../../helpers';
import { StatusContext } from '../../context/Status';
import { UserContext } from '../../context/User';

const { Text } = Typography;

const cleanMarkdownText = (value = '') =>
  value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`\-]/g, ' ')
    .replace(/\[[^\]]+\]\([^\)]+\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

const MobileConsoleHome = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [statusState] = useContext(StatusContext);
  const [userState] = useContext(UserContext);
  const [noticeSummary, setNoticeSummary] = useState('');
  const [rebateInfo, setRebateInfo] = useState({
    percent: 0,
    maxCount: 0,
  });

  const announcements = statusState?.status?.announcements || [];

  const latestAnnouncements = useMemo(
    () => (Array.isArray(announcements) ? announcements.slice(0, 3) : []),
    [announcements],
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [noticeRes, topupRes] = await Promise.all([
        API.get('/api/notice').catch(() => null),
        API.get('/api/user/topup/info').catch(() => null),
      ]);

      if (!mounted) return;

      if (noticeRes?.data?.success && noticeRes.data.data) {
        setNoticeSummary(cleanMarkdownText(noticeRes.data.data));
      }

      if (topupRes?.data?.success) {
        const data = topupRes.data.data || {};
        setRebateInfo({
          percent: data.topup_rebate_percent || 0,
          maxCount: data.topup_rebate_max_count || 0,
        });
      }
    };

    load().catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className='h5-console-page mt-[60px] px-2 pb-3'>
      <Space vertical spacing={12} style={{ width: '100%' }}>
        <Card className='h5-home-card !rounded-2xl'>
          <div className='h5-home-card-header'>
            <div className='h5-home-card-title'>
              <Bell size={16} />
              <span>{t('系统公告')}</span>
            </div>
            <Button
              type='tertiary'
              size='small'
              icon={<ChevronRight size={14} />}
              onClick={() => navigate('/console/messages')}
            >
              {t('查看全部')}
            </Button>
          </div>

          {latestAnnouncements.length === 0 && !noticeSummary ? (
            <Empty description={t('暂无公告')} image={null} />
          ) : (
            <Space vertical spacing={8} style={{ width: '100%' }}>
              {latestAnnouncements.map((item, idx) => (
                <div key={idx} className='h5-home-list-item'>
                  <div className='h5-home-list-main'>
                    {cleanMarkdownText(item?.content || t('系统公告'))}
                  </div>
                  <Tag size='small' color='white'>
                    {formatDate(item?.publishDate)}
                  </Tag>
                </div>
              ))}
              {noticeSummary ? (
                <Text type='tertiary' className='h5-home-summary'>
                  {noticeSummary.slice(0, 120)}
                  {noticeSummary.length > 120 ? '...' : ''}
                </Text>
              ) : null}
            </Space>
          )}
        </Card>

        <Card className='h5-home-card !rounded-2xl'>
          <div className='h5-home-card-header'>
            <div className='h5-home-card-title'>
              <Gift size={16} />
              <span>{t('邀请奖励')}</span>
            </div>
            <Button
              type='tertiary'
              size='small'
              icon={<ChevronRight size={14} />}
              onClick={() => navigate('/console/topup')}
            >
              {t('去查看')}
            </Button>
          </div>

          <div className='h5-home-stat-grid'>
            <div className='h5-home-stat-item'>
              <Text type='tertiary'>{t('待使用收益')}</Text>
              <Text strong>{renderQuota(userState?.user?.aff_quota || 0)}</Text>
            </div>
            <div className='h5-home-stat-item'>
              <Text type='tertiary'>{t('历史收益')}</Text>
              <Text strong>
                {renderQuota(userState?.user?.aff_history_quota || 0)}
              </Text>
            </div>
            <div className='h5-home-stat-item'>
              <Text type='tertiary'>{t('邀请人数')}</Text>
              <Text strong>{userState?.user?.aff_count || 0}</Text>
            </div>
          </div>
        </Card>

        <Card className='h5-home-card !rounded-2xl'>
          <div className='h5-home-card-header'>
            <div className='h5-home-card-title'>
              <WalletCards size={16} />
              <span>{t('充值返利')}</span>
            </div>
            <Button
              type='tertiary'
              size='small'
              icon={<ChevronRight size={14} />}
              onClick={() => navigate('/console/topup')}
            >
              {t('立即充值')}
            </Button>
          </div>

          {rebateInfo.percent > 0 && rebateInfo.maxCount > 0 ? (
            <div className='h5-home-rebate'>
              <div className='h5-home-rebate-main'>
                <span className='h5-home-rebate-percent'>{rebateInfo.percent}%</span>
                <Text type='tertiary'>{t('邀请好友充值返利比例')}</Text>
              </div>
              <Text type='tertiary'>
                {t('每位好友前 {{count}} 次充值可获得返利', {
                  count: rebateInfo.maxCount,
                })}
              </Text>
            </div>
          ) : (
            <Text type='tertiary'>{t('当前未开启返利活动')}</Text>
          )}
        </Card>
      </Space>
    </div>
  );
};

export default MobileConsoleHome;
