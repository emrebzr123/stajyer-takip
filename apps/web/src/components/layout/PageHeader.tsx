'use client';
import React from 'react';
import Button from '../ui/Button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  btnText?: string;
  btnIcon?: string;
  onBtnClick?: () => void;
}

export default function PageHeader({
  title, subtitle, btnText, btnIcon = 'plus', onBtnClick,
}: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {btnText && (
        <Button icon={btnIcon} onClick={onBtnClick}>
          {btnText}
        </Button>
      )}
    </div>
  );
}
