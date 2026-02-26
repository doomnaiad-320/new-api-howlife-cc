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
import { Sparkles, WalletCards } from 'lucide-react';
import { AppButton, AppCard } from '../ui';

const HomeRebateCard = ({ t, rebateInfo, onTopup }) => {
  return (
    <AppCard className='h5-home-app-card h5-home-app-rebate'>
      <div className='h5-home-app-card-header'>
        <div className='h5-home-app-card-title'>
          <WalletCards size={16} />
          <span>{t('充值返利')}</span>
        </div>
        <AppButton
          type='primary'
          icon={<Sparkles size={14} />}
          onClick={onTopup}
          className='h5-home-app-cta-btn'
        >
          {t('立即充值')}
        </AppButton>
      </div>

      {rebateInfo.percent > 0 && rebateInfo.maxCount > 0 ? (
        <div className='h5-home-app-rebate-body'>
          <div className='h5-home-app-rebate-percent-wrap'>
            <span className='h5-home-app-rebate-percent'>{rebateInfo.percent}%</span>
            <p className='h5-home-app-muted'>{t('邀请好友充值返利比例')}</p>
          </div>
          <div className='h5-home-app-rebate-track'>
            <span
              className='h5-home-app-rebate-track-fill'
              style={{ width: `${Math.min(100, Math.max(8, rebateInfo.percent))}%` }}
            />
          </div>
          <p className='h5-home-app-muted'>
            {t('每位好友前 {{count}} 次充值可获得返利', {
              count: rebateInfo.maxCount,
            })}
          </p>
        </div>
      ) : (
        <p className='h5-home-app-muted'>{t('当前未开启返利活动')}</p>
      )}
    </AppCard>
  );
};

export default HomeRebateCard;
