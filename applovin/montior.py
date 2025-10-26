import psutil
import sys
import time
import matplotlib.pyplot as plt

# <command> & echo $! | xargs python3 montior.py

pid = int(sys.argv[1])
process = psutil.Process(pid)

cpu, ram, timestamps = [], [], []
start = time.time()

try:
    while process.is_running():
        cpu.append(process.cpu_percent())
        ram.append(process.memory_info().rss / 1024 / 1024)
        timestamps.append(time.time() - start)
        time.sleep(0.5)
except (psutil.NoSuchProcess, KeyboardInterrupt):
    pass

# Save to image
plt.figure(figsize=(10, 5))
plt.subplot(1, 2, 1)
plt.plot(timestamps, cpu)
plt.title('CPU Usage')
plt.xlabel('Time (s)')
plt.ylabel('CPU %')
plt.subplot(1, 2, 2)
plt.plot(timestamps, ram)
plt.title('RAM Usage (MB)')
plt.xlabel('Time (s)')
plt.ylabel('MB')
plt.tight_layout()
plt.savefig('resource_usage.png')
print('Saved to resource_usage.png')
