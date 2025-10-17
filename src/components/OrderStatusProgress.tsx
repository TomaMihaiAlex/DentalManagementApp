import React from 'react';

interface OrderStatusProgressProps {
  stats: {
    completed: number;
    inProgress: number;
    delayed: number;
    total: number;
  };
}

const OrderStatusProgress: React.FC<OrderStatusProgressProps> = ({ stats }) => {
  const { completed, inProgress, delayed, total } = stats;

  if (total === 0) {
    return (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-300">Nicio comandă de afișat</span>
        </div>
    );
  }

  const completedPercent = (completed / total) * 100;
  const inProgressPercent = (inProgress / total) * 100;
  const delayedPercent = (delayed / total) * 100;

  const segments = [
    { percent: completedPercent, color: 'bg-success', label: `Finalizate: ${completedPercent.toFixed(1)}%` },
    { percent: inProgressPercent, color: 'bg-warning', label: `În progres: ${inProgressPercent.toFixed(1)}%` },
    { percent: delayedPercent, color: 'bg-danger', label: `Întârziate: ${delayedPercent.toFixed(1)}%` },
  ];

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 flex overflow-hidden">
      {segments.map((segment, index) =>
        segment.percent > 0 ? (
          <div
            key={index}
            style={{ width: `${segment.percent}%` }}
            className={`flex items-center justify-center text-white text-xs font-bold ${segment.color} transition-all duration-500`}
            title={segment.label}
          >
            {segment.percent > 10 ? segment.label : ''}
          </div>
        ) : null
      )}
    </div>
  );
};

export default OrderStatusProgress;
