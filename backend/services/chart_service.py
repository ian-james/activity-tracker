"""
Chart generation service for email summaries.
Uses matplotlib to generate server-side charts as PNG bytes.
"""
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional
from io import BytesIO


def generate_daily_completion_chart(daily_data: List[Dict]) -> bytes:
    """
    Generate a 7-day bar chart showing daily completion percentages.

    Args:
        daily_data: List of dicts with keys: date, percentage, completed, total

    Returns:
        PNG image as bytes
    """
    fig, ax = plt.subplots(figsize=(8, 4), dpi=150)

    dates = [datetime.strptime(d['date'], '%Y-%m-%d') for d in daily_data]
    percentages = [d['percentage'] for d in daily_data]

    # Color-code bars based on completion percentage
    colors = []
    for pct in percentages:
        if pct >= 90:
            colors.append('#10B981')  # Green
        elif pct >= 70:
            colors.append('#3B82F6')  # Blue
        elif pct >= 50:
            colors.append('#F59E0B')  # Yellow
        else:
            colors.append('#EF4444')  # Red

    bars = ax.bar(dates, percentages, color=colors, width=0.8)

    # Format x-axis
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%a\n%m/%d'))
    ax.xaxis.set_major_locator(mdates.DayLocator())

    # Set y-axis limits and labels
    ax.set_ylim(0, 100)
    ax.set_ylabel('Completion %', fontsize=10, fontweight='bold')
    ax.set_title('Daily Completion (Last 7 Days)', fontsize=12, fontweight='bold', pad=15)

    # Add percentage labels on top of bars
    for bar, pct in zip(bars, percentages):
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + 2,
                f'{int(pct)}%',
                ha='center', va='bottom', fontsize=8, fontweight='bold')

    # Add gridlines
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.set_axisbelow(True)

    # Tight layout
    plt.tight_layout()

    # Save to bytes
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor='white')
    buf.seek(0)
    plt.close(fig)

    return buf.read()


def generate_category_chart(category_data: List[Dict]) -> bytes:
    """
    Generate a horizontal bar chart showing category breakdown (top 5).

    Args:
        category_data: List of dicts with keys: name, color, percentage, completed, total

    Returns:
        PNG image as bytes
    """
    fig, ax = plt.subplots(figsize=(8, 4), dpi=150)

    # Take top 5 categories
    top_categories = category_data[:5]

    if not top_categories:
        # No data - show empty state
        ax.text(0.5, 0.5, 'No category data available',
                ha='center', va='center', fontsize=12, color='gray')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
    else:
        names = [c['name'] for c in top_categories]
        percentages = [c['percentage'] for c in top_categories]
        colors = [c['color'] for c in top_categories]

        # Create horizontal bars
        y_pos = range(len(names))
        bars = ax.barh(y_pos, percentages, color=colors, height=0.6)

        # Set labels
        ax.set_yticks(y_pos)
        ax.set_yticklabels(names, fontsize=9)
        ax.set_xlim(0, 100)
        ax.set_xlabel('Completion %', fontsize=10, fontweight='bold')
        ax.set_title('Category Progress (Top 5)', fontsize=12, fontweight='bold', pad=15)

        # Add percentage labels
        for bar, pct in zip(bars, percentages):
            width = bar.get_width()
            ax.text(width + 2, bar.get_y() + bar.get_height()/2.,
                    f'{int(pct)}%',
                    ha='left', va='center', fontsize=8, fontweight='bold')

        # Add gridlines
        ax.grid(axis='x', alpha=0.3, linestyle='--')
        ax.set_axisbelow(True)

    # Tight layout
    plt.tight_layout()

    # Save to bytes
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor='white')
    buf.seek(0)
    plt.close(fig)

    return buf.read()


def generate_workout_progression_chart(workout_data: List[Dict]) -> bytes:
    """
    Generate a line chart showing workout progression over time.

    Args:
        workout_data: List of dicts with keys: date, duration_minutes, session_count

    Returns:
        PNG image as bytes
    """
    fig, ax = plt.subplots(figsize=(8, 4), dpi=150)

    if not workout_data:
        # No data - show empty state
        ax.text(0.5, 0.5, 'No workout data available',
                ha='center', va='center', fontsize=12, color='gray')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
    else:
        dates = [datetime.strptime(d['date'], '%Y-%m-%d') for d in workout_data]
        durations = [d['duration_minutes'] for d in workout_data]

        # Plot line
        ax.plot(dates, durations, marker='o', color='#3B82F6',
                linewidth=2, markersize=6, label='Duration')

        # Fill under the line
        ax.fill_between(dates, durations, alpha=0.2, color='#3B82F6')

        # Format x-axis
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=max(1, len(dates) // 7)))
        plt.xticks(rotation=45)

        # Set labels
        ax.set_ylabel('Duration (minutes)', fontsize=10, fontweight='bold')
        ax.set_title('Workout Duration Progression', fontsize=12, fontweight='bold', pad=15)

        # Add gridlines
        ax.grid(alpha=0.3, linestyle='--')
        ax.set_axisbelow(True)

        # Set y-axis to start at 0
        ax.set_ylim(bottom=0)

    # Tight layout
    plt.tight_layout()

    # Save to bytes
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor='white')
    buf.seek(0)
    plt.close(fig)

    return buf.read()


def generate_streak_chart(streak_data: List[Dict]) -> bytes:
    """
    Generate a simple visualization showing current streaks.

    Args:
        streak_data: List of dicts with keys: activity_name, current_streak, best_streak

    Returns:
        PNG image as bytes
    """
    fig, ax = plt.subplots(figsize=(8, 4), dpi=150)

    if not streak_data:
        # No data - show empty state
        ax.text(0.5, 0.5, 'No streak data available',
                ha='center', va='center', fontsize=12, color='gray')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
    else:
        # Take top 5 streaks
        top_streaks = sorted(streak_data, key=lambda x: x['current_streak'], reverse=True)[:5]

        names = [s['activity_name'] for s in top_streaks]
        current = [s['current_streak'] for s in top_streaks]
        best = [s['best_streak'] for s in top_streaks]

        y_pos = range(len(names))
        width = 0.35

        # Create grouped bars
        ax.barh([i - width/2 for i in y_pos], current, width,
                label='Current Streak', color='#10B981')
        ax.barh([i + width/2 for i in y_pos], best, width,
                label='Best Streak', color='#3B82F6')

        # Set labels
        ax.set_yticks(y_pos)
        ax.set_yticklabels(names, fontsize=9)
        ax.set_xlabel('Days', fontsize=10, fontweight='bold')
        ax.set_title('Activity Streaks (Top 5)', fontsize=12, fontweight='bold', pad=15)
        ax.legend(fontsize=8)

        # Add gridlines
        ax.grid(axis='x', alpha=0.3, linestyle='--')
        ax.set_axisbelow(True)

    # Tight layout
    plt.tight_layout()

    # Save to bytes
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', facecolor='white')
    buf.seek(0)
    plt.close(fig)

    return buf.read()
