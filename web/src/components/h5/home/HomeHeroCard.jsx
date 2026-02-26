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
import { ReceiptText, WalletCards } from 'lucide-react';
import { AppButton, AppCard } from '../ui';

const HomeHeroCard = ({
  t,
  userName,
  balance,
  usedQuota,
  statQuota,
  requestCount,
  onTopup,
  onViewLog,
}) => {
  return (
    <AppCard className='h5-home-app-hero'>
      <div className='h5-home-app-kicker'>{t('移动端控制台')}</div>
      <div className='h5-home-app-hero-top'>
        <div>
          <p className='h5-home-app-hero-sub'>{t('欢迎回来')}</p>
          <h2 className='h5-home-app-hero-title'>
            {t('你好，{{name}}', { name: userName })}
          </h2>
        </div>

        <div className='h5-home-app-online'>
          <span className='h5-home-app-online-dot' />
          <span>{t('在线')}</span>
        </div>
      </div>

      <div className='h5-home-app-balance'>
        <p className='h5-home-app-hero-sub'>{t('当前余额')}</p>
        <div className='h5-home-app-balance-value'>{balance}</div>
      </div>

      <div className='h5-home-app-metrics'>
        <div className='h5-home-app-metric'>
          <p className='h5-home-app-metric-label'>{t('历史消耗')}</p>
          <p className='h5-home-app-metric-value'>{usedQuota}</p>
        </div>
        <div className='h5-home-app-metric'>
          <p className='h5-home-app-metric-label'>{t('统计额度')}</p>
          <p className='h5-home-app-metric-value'>{statQuota}</p>
        </div>
        <div className='h5-home-app-metric'>
          <p className='h5-home-app-metric-label'>{t('请求次数')}</p>
          <p className='h5-home-app-metric-value'>{requestCount}</p>
        </div>
      </div>

      <div className='h5-home-app-hero-actions'>
        <AppButton
          type='primary'
          icon={<WalletCards size={14} />}
          onClick={onTopup}
          className='h5-home-app-btn'
        >
          {t('去充值')}
        </AppButton>
        <AppButton
          type='secondary'
          icon={<ReceiptText size={14} />}
          onClick={onViewLog}
          className='h5-home-app-btn-secondary'
        >
          {t('查看请求日志')}
        </AppButton>
      </div>
    </AppCard>
  );
};

export default HomeHeroCard;
