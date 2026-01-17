import { Plus, Lightbulb, Share2 } from 'lucide-react';

function CalendarView({ posts, onCreateClick, onBestTimesClick }) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    const scheduledPostsByDate = {};
    posts.filter(p => p.status === 'scheduled' && p.scheduledDate).forEach(post => {
        const date = new Date(post.scheduledDate).toDateString();
        if (!scheduledPostsByDate[date]) {
            scheduledPostsByDate[date] = [];
        }
        scheduledPostsByDate[date].push(post);
    });

    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="calendar-view">
            <div className="calendar-header">
                <h3>Content Calendar</h3>
                <div className="calendar-actions">
                    <button className="btn btn-outline" onClick={onCreateClick}>
                        <Plus size={18} />
                        Schedule Post
                    </button>
                    <button className="btn btn-outline" onClick={onBestTimesClick}>
                        <Lightbulb size={18} />
                        Best Times
                    </button>
                </div>
            </div>
            <div className="calendar-grid">
                <div className="calendar-month-header">
                    <h4>{monthNames[currentMonth]} {currentYear}</h4>
                </div>
                <div className="calendar-weekdays">
                    {dayNames.map(day => (
                        <div key={day} className="calendar-weekday">{day}</div>
                    ))}
                </div>
                <div className="calendar-days">
                    {calendarDays.map((day, index) => {
                        if (day === null) {
                            return <div key={index} className="calendar-day empty"></div>;
                        }
                        const date = new Date(currentYear, currentMonth, day);
                        const dateString = date.toDateString();
                        const dayPosts = scheduledPostsByDate[dateString] || [];
                        const isToday = day === today.getDate() && currentMonth === today.getMonth();
                        
                        return (
                            <div key={index} className={`calendar-day ${isToday ? 'today' : ''}`}>
                                <div className="calendar-day-number">{day}</div>
                                {dayPosts.length > 0 && (
                                    <div className="calendar-day-posts">
                                        {dayPosts.slice(0, 3).map((post, i) => (
                                            <div key={i} className="calendar-post-dot" title={post.content?.substring(0, 50)}></div>
                                        ))}
                                        {dayPosts.length > 3 && (
                                            <div className="calendar-post-more">+{dayPosts.length - 3}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {Object.keys(scheduledPostsByDate).length === 0 && (
                <div className="calendar-empty-state">
                    <Share2 size={48} />
                    <h4>No scheduled posts</h4>
                    <p>Schedule your first post to see it on the calendar</p>
                    <button className="btn btn-primary" onClick={onCreateClick}>
                        <Plus size={18} />
                        Schedule Post
                    </button>
                </div>
            )}
        </div>
    );
}

export default CalendarView;
