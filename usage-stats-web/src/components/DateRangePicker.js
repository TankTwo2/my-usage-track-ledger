import React from 'react';

const DateRangePicker = ({ selectedPeriod, selectedDate, onPeriodChange, onDateChange }) => {
    const periods = [
        { value: 'daily', label: '일별' },
        { value: 'weekly', label: '주별' },
        { value: 'monthly', label: '월별' }
    ];

    const formatDateForInput = (date) => {
        return date.toISOString().split('T')[0];
    };

    const getDateLabel = () => {
        const date = new Date(selectedDate);
        
        switch (selectedPeriod) {
            case 'daily':
                return date.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            case 'weekly':
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - date.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                
                return `${startOfWeek.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`;
            case 'monthly':
                return date.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long'
                });
            default:
                return '';
        }
    };

    return (
        <div className="date-range-picker">
            <div className="period-selector">
                {periods.map(period => (
                    <button
                        key={period.value}
                        className={`period-btn ${selectedPeriod === period.value ? 'active' : ''}`}
                        onClick={() => onPeriodChange(period.value)}
                    >
                        {period.label}
                    </button>
                ))}
            </div>
            
            <div className="date-selector">
                <div className="date-display">
                    <span className="date-label">{getDateLabel()}</span>
                </div>
                
                <div className="date-controls">
                    <button
                        className="date-nav-btn"
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            switch (selectedPeriod) {
                                case 'daily':
                                    newDate.setDate(newDate.getDate() - 1);
                                    break;
                                case 'weekly':
                                    newDate.setDate(newDate.getDate() - 7);
                                    break;
                                case 'monthly':
                                    newDate.setMonth(newDate.getMonth() - 1);
                                    break;
                                default:
                                    // 기본값 처리
                                    break;
                            }
                            onDateChange(formatDateForInput(newDate));
                        }}
                        title="이전"
                    >
                        ◀
                    </button>
                    
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="date-input"
                    />
                    
                    <button
                        className="date-nav-btn"
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            const today = new Date();
                            
                            switch (selectedPeriod) {
                                case 'daily':
                                    newDate.setDate(newDate.getDate() + 1);
                                    break;
                                case 'weekly':
                                    newDate.setDate(newDate.getDate() + 7);
                                    break;
                                case 'monthly':
                                    newDate.setMonth(newDate.getMonth() + 1);
                                    break;
                                default:
                                    // 기본값 처리
                                    break;
                            }
                            
                            // 미래 날짜는 선택할 수 없도록 제한
                            if (newDate <= today) {
                                onDateChange(formatDateForInput(newDate));
                            }
                        }}
                        title="다음"
                        disabled={(() => {
                            const nextDate = new Date(selectedDate);
                            const today = new Date();
                            
                            switch (selectedPeriod) {
                                case 'daily':
                                    nextDate.setDate(nextDate.getDate() + 1);
                                    break;
                                case 'weekly':
                                    nextDate.setDate(nextDate.getDate() + 7);
                                    break;
                                case 'monthly':
                                    nextDate.setMonth(nextDate.getMonth() + 1);
                                    break;
                                default:
                                    // 기본값 처리
                                    break;
                            }
                            
                            return nextDate > today;
                        })()}
                    >
                        ▶
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DateRangePicker;