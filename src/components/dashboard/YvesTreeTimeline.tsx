import { motion } from "framer-motion";

const nodes = [
  { id: "mind", label: "Mind", x: 50, y: 10, color: "bg-cyan-400" },
  { id: "recovery", label: "Recovery", x: 15, y: 30, color: "bg-green-400" },
  { id: "data", label: "Data", x: 85, y: 30, color: "bg-violet-400" },
  { id: "core", label: "Core", x: 50, y: 45, color: "bg-indigo-400" },
  { id: "body", label: "Body", x: 30, y: 70, color: "bg-amber-400" },
  { id: "performance", label: "Performance", x: 70, y: 70, color: "bg-red-400" },
];

export const YvesTreeModern = () => {
  return (
    <div className="relative w-full h-[500px] bg-gradient-to-b from-background via-background to-background rounded-3xl overflow-hidden">
      {/* Connections */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <g stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
          <line x1="50%" y1="10%" x2="50%" y2="45%" />
          <line x1="15%" y1="30%" x2="50%" y2="45%" />
          <line x1="85%" y1="30%" x2="50%" y2="45%" />
          <line x1="50%" y1="45%" x2="30%" y2="70%" />
          <line x1="50%" y1="45%" x2="70%" y2="70%" />
        </g>
      </svg>

      {/* Nodes */}
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className={`absolute flex flex-col items-center text-center`}
          style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}
          whileHover={{ scale: 1.1 }}
        >
          <motion.div
            className={`w-6 h-6 rounded-full shadow-md ${node.color}`}
            animate={{ boxShadow: `0 0 12px ${node.color.replace("bg-", "#")}` }}
          />
          <span className="text-xs text-muted-foreground mt-2 tracking-wide">{node.label}</span>
        </motion.div>
      ))}
    </div>
  );
};
