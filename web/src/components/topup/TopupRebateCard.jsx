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

import React from 'react';
import { Avatar, Typography, Card, Badge, Space } from '@douyinfe/semi-ui';
import { Percent, RefreshCw, Users, Sparkles } from 'lucide-react';

const { Text } = Typography;

const TopupRebateCard = ({ t, rebatePercent, rebateMaxCount }) => {
  // 如果返利功能未启用，不显示卡片
  if (!rebatePercent || rebatePercent <= 0 || !rebateMaxCount || rebateMaxCount <= 0) {
    return null;
  }

  return (
    <Card className='!rounded-2xl shadow-sm border-0 mt-6'>
      {/* 卡片头部 */}
      <div className='flex items-center mb-4'>
        <Avatar size='small' color='orange' className='mr-3 shadow-md'>
          <Sparkles size={16} />
        </Avatar>
        <div>
          <Typography.Text className='text-lg font-medium'>
            {t('充值返利')}
          </Typography.Text>
          <div className='text-xs'>{t('邀请好友充值，您也能获得奖励')}</div>
        </div>
      </div>

      {/* 返利数据展示 */}
      <Card
        className='!rounded-xl w-full'
        cover={
          <div
            className='relative h-24'
            style={{
              '--palette-primary-darkerChannel': '234 88 12',
              backgroundImage: `linear-gradient(135deg, rgba(234, 88, 12, 0.9), rgba(249, 115, 22, 0.8))`,
            }}
          >
            <div className='relative z-10 h-full flex items-center justify-around p-4'>
              {/* 返利比例 */}
              <div className='text-center'>
                <div
                  className='text-3xl font-bold mb-1'
                  style={{ color: 'white' }}
                >
                  {rebatePercent}%
                </div>
                <div className='flex items-center justify-center text-sm'>
                  <Percent
                    size={14}
                    className='mr-1'
                    style={{ color: 'rgba(255,255,255,0.9)' }}
                  />
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '12px',
                    }}
                  >
                    {t('返利比例')}
                  </Text>
                </div>
              </div>

              {/* 分隔线 */}
              <div
                className='h-12 w-px'
                style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
              />

              {/* 最大返利次数 */}
              <div className='text-center'>
                <div
                  className='text-3xl font-bold mb-1'
                  style={{ color: 'white' }}
                >
                  {rebateMaxCount}
                </div>
                <div className='flex items-center justify-center text-sm'>
                  <RefreshCw
                    size={14}
                    className='mr-1'
                    style={{ color: 'rgba(255,255,255,0.9)' }}
                  />
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '12px',
                    }}
                  >
                    {t('返利次数')}
                  </Text>
                </div>
              </div>
            </div>
          </div>
        }
      >
        {/* 返利说明 */}
        <div className='space-y-3'>
          <div className='flex items-start gap-2'>
            <Badge dot type='warning' />
            <Text type='tertiary' className='text-sm'>
              {t('您邀请的好友每次充值，您都可获得其充值额度的')} <Text strong style={{ color: 'rgb(234, 88, 12)' }}>{rebatePercent}%</Text> {t('作为返利')}
            </Text>
          </div>

          <div className='flex items-start gap-2'>
            <Badge dot type='warning' />
            <Text type='tertiary' className='text-sm'>
              {t('每位好友的前')} <Text strong style={{ color: 'rgb(234, 88, 12)' }}>{rebateMaxCount}</Text> {t('次充值可获得返利奖励')}
            </Text>
          </div>

          <div className='flex items-start gap-2'>
            <Badge dot type='warning' />
            <Text type='tertiary' className='text-sm'>
              {t('返利将自动计入您的邀请奖励额度，可划转到账户余额使用')}
            </Text>
          </div>
        </div>
      </Card>
    </Card>
  );
};

export default TopupRebateCard;
