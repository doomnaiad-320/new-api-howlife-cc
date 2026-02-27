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
import { TicketCheck, ExternalLink } from 'lucide-react';
import { AppCard } from '../ui';

const TopupRedeemCard = ({
  t,
  redemptionCode,
  setRedemptionCode,
  topUp,
  isSubmitting,
  topUpLink,
  openTopUpLink,
}) => {
  return (
    <AppCard className='h5-topup-card h5-topup-redeem-card'>
      <div className='h5-topup-section'>
        <h4 className='h5-topup-section-title'>
          <TicketCheck size={15} />
          <span>{t('兑换码充值')}</span>
        </h4>
        <div className='h5-topup-redeem-row'>
          <input
            type='text'
            className='h5-topup-input h5-topup-redeem-input'
            placeholder={t('请输入兑换码')}
            value={redemptionCode}
            onChange={(e) => setRedemptionCode(e.target.value)}
          />
          <button
            type='button'
            className='h5-app-btn h5-app-btn-primary h5-topup-redeem-btn'
            onClick={topUp}
            disabled={isSubmitting || !redemptionCode}
          >
            {isSubmitting ? t('兑换中...') : t('兑换')}
          </button>
        </div>
        {topUpLink && (
          <button type='button' className='h5-topup-link-btn' onClick={openTopUpLink}>
            <span>{t('购买兑换码')}</span>
            <ExternalLink size={13} />
          </button>
        )}
      </div>
    </AppCard>
  );
};

export default TopupRedeemCard;
