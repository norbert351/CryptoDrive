import { motion } from 'framer-motion';
import { HardDrive, File, Users, ArrowUpRight } from 'lucide-react';

interface DashboardStatsProps {
  totalFiles: number;
  totalSize: number; // in bytes
}

export function DashboardStats({ totalFiles, totalSize }: DashboardStatsProps) {
  function formatSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const stats = [
    {
      name: 'Storage Used',
      value: formatSize(totalSize),
      icon: HardDrive,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      borderColor: 'border-emerald-400/20',
      trend: '+12% this week'
    },
    {
      name: 'Files Stored',
      value: totalFiles.toString(),
      icon: File,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-400/20',
      trend: '+5 files today'
    },
    {
      name: 'Shared Links',
      value: '0',
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      borderColor: 'border-purple-400/20',
      trend: 'No active links'
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8"
    >
      {stats.map((stat) => (
        <motion.div
          key={stat.name}
          variants={item}
          className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 glass-card"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`rounded-xl p-2.5 border ${stat.bgColor} ${stat.borderColor} ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-zinc-500" />
          </div>
          
          <div>
            <p className="text-sm font-medium text-zinc-400">{stat.name}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-white">{stat.value}</p>
          </div>
          
          <div className="mt-4 flex items-center text-xs text-zinc-500">
            <span>{stat.trend}</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
