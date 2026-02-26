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
import { Copy, Gift } from 'lucide-react';
import { AppCard } from '../ui';

const HomeInviteCard = ({
  t,
  rebatePercent,
  inviteCode,
  inviteLink,
  affHistoryQuota,
  affCount,
  onCopyInviteCode,
  onCopyInviteLink,
}) => {
  const slogan =
    rebatePercent > 0
      ? t('邀请好友加入，最高可享{{percent}}%充值返利，奖励无上限！', {
          percent: rebatePercent,
        })
      : t('邀请好友加入，充值返利，奖励无上限！');

  return (
    <AppCard className='h5-home-app-card h5-home-app-invite-referral'>
      <div className='h5-home-app-invite-head'>
        <div className='h5-home-app-card-title h5-home-app-invite-main-title'>
          <Gift size={16} />
          <span>{t('邀请返利')}</span>
        </div>
        <p className='h5-home-app-invite-subtitle'>{t('有福同享，每次充值都能赚')}</p>
      </div>

      <div className='h5-home-app-invite-banner'>{slogan}</div>

      <div className='h5-home-app-invite-field'>
        <div className='h5-home-app-invite-field-text'>
          <span className='h5-home-app-invite-label'>{t('我的邀请码')}:</span>
          <span className='h5-home-app-invite-value'>{inviteCode || '-'}</span>
        </div>
        <button
          type='button'
          className='h5-home-app-copy-btn'
          onClick={onCopyInviteCode}
          aria-label={t('复制邀请码')}
        >
          <Copy size={16} />
        </button>
      </div>

      <div className='h5-home-app-invite-field'>
        <div className='h5-home-app-invite-field-text'>
          <span className='h5-home-app-invite-label'>{t('邀请链接')}:</span>
          <span className='h5-home-app-invite-value'>{inviteLink || '-'}</span>
        </div>
        <button
          type='button'
          className='h5-home-app-copy-btn'
          onClick={onCopyInviteLink}
          aria-label={t('复制邀请链接')}
        >
          <Copy size={16} />
        </button>
      </div>

      <div className='h5-home-app-invite-metrics'>
        <div className='h5-home-app-invite-metric'>
          <p className='h5-home-app-invite-metric-label'>{t('累计收益')}</p>
          <p className='h5-home-app-invite-metric-value'>{affHistoryQuota}</p>
        </div>
        <div className='h5-home-app-invite-metric h5-home-app-invite-metric-second'>
          <p className='h5-home-app-invite-metric-label'>{t('成功邀请')}</p>
          <p className='h5-home-app-invite-metric-value'>{t('{{count}}人', { count: affCount })}</p>
        </div>
      </div>

      <p className='h5-home-app-invite-note'>
        {t('新用户在充值时填写您的邀请码，您将获得充值金额的返利。')}
      </p>
    </AppCard>
  );
};

export default HomeInviteCard;
