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
import { ChevronRight, Gift } from 'lucide-react';
import { AppButton, AppCard } from '../ui';

const HomeInviteCard = ({ t, affQuota, affHistoryQuota, affCount, onView }) => {
  return (
    <AppCard className='h5-home-app-card h5-home-app-invite'>
      <div className='h5-home-app-card-header'>
        <div className='h5-home-app-card-title'>
          <Gift size={16} />
          <span>{t('邀请奖励')}</span>
        </div>
        <AppButton
          type='ghost'
          icon={<ChevronRight size={14} />}
          onClick={onView}
          className='h5-home-app-link-btn'
        >
          {t('详情')}
        </AppButton>
      </div>

      <p className='h5-home-app-muted'>{t('邀请好友后可获得奖励返利')}</p>

      <div className='h5-home-app-stats'>
        <div className='h5-home-app-stat'>
          <p className='h5-home-app-stat-label'>{t('待使用收益')}</p>
          <p className='h5-home-app-stat-value'>{affQuota}</p>
        </div>
        <div className='h5-home-app-stat'>
          <p className='h5-home-app-stat-label'>{t('历史收益')}</p>
          <p className='h5-home-app-stat-value'>{affHistoryQuota}</p>
        </div>
        <div className='h5-home-app-stat'>
          <p className='h5-home-app-stat-label'>{t('邀请人数')}</p>
          <p className='h5-home-app-stat-value'>{affCount}</p>
        </div>
      </div>
    </AppCard>
  );
};

export default HomeInviteCard;
