import React from 'react';

type BankType = 'WISE' | 'SOCIETE_GENERALE' | 'CIH';

interface BankInformationProps {
  bank: BankType;
}

interface BankDetails {
  accountName: string;
  iban: string;
  swift: string;
  bankAddress: string;
  accountDetails: string;
  rib?: string;
  currency: string;
}

const bankInformation: Record<BankType, BankDetails> = {
  WISE: {
    accountName: "WISE BUSINESS",
    iban: "BE12 3456 7890 1234",
    swift: "TRWIBEB1XXX",
    bankAddress: "Avenue Louise 54, Room S52, Brussels 1050, Belgium",
    accountDetails: "Account number: 1234567890",
    currency: "EUR"
  },
  SOCIETE_GENERALE: {
    accountName: "SOCIETE GENERALE MAROC",
    iban: "FR76 3000 6000 0123 4567 8900 189",
    swift: "SOGEFRPP",
    bankAddress: "29 Boulevard Haussmann, 75009 Paris, France",
    accountDetails: "Account number: 00020012345",
    rib: "123456789012345678901234",
    currency: "EUR"
  },
  CIH: {
    accountName: "CIH BANK",
    iban: "MA64 011 519 0000001210001234 56",
    swift: "CIHWMAMC",
    bankAddress: "187, Avenue Hassan II, Casablanca, Morocco",
    accountDetails: "Account number: 007 640 0001210001234567",
    rib: "007640000121000123456789",
    currency: "MAD"
  }
};

const BankInformation: React.FC<BankInformationProps> = ({ bank }) => {
  const info = bankInformation[bank];

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900 dark:text-white">Bank Information</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">Account Name:</span>
          <span className="font-medium text-gray-900 dark:text-white">{info.accountName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">IBAN:</span>
          <span className="font-medium text-gray-900 dark:text-white">{info.iban}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">SWIFT/BIC:</span>
          <span className="font-medium text-gray-900 dark:text-white">{info.swift}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">Bank Address:</span>
          <span className="font-medium text-gray-900 dark:text-white">{info.bankAddress}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">Account Details:</span>
          <span className="font-medium text-gray-900 dark:text-white">{info.accountDetails}</span>
        </div>
        {info.rib && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">RIB:</span>
            <span className="font-medium text-gray-900 dark:text-white">{info.rib}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">Currency:</span>
          <span className="font-medium text-gray-900 dark:text-white">{info.currency}</span>
        </div>
      </div>
    </div>
  );
};

export default BankInformation; 