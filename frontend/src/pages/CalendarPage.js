import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const CalendarPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [calendarView, setCalendarView] = useState('month'); // month, week, day

  useEffect(() => {
    loadCalendarEvents();
  }, [currentDate, calendarView]);

  const loadCalendarEvents = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/calendar/events`, {
        params: {
          start: getStartDate(),
          end: getEndDate(),
          view: calendarView
        }
      });
      setEvents(response.data.data || []);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const date = new Date(currentDate);
    if (calendarView === 'month') {
      date.setDate(1);
      date.setDate(date.getDate() - date.getDay());
    } else if (calendarView === 'week') {
      date.setDate(date.getDate() - date.getDay());
    }
    return date.toISOString();
  };

  const getEndDate = () => {
    const date = new Date(currentDate);
    if (calendarView === 'month') {
      date.setMonth(date.getMonth() + 1, 0);
      date.setDate(date.getDate() + (6 - date.getDay()));
    } else if (calendarView === 'week') {
      date.setDate(date.getDate() + 6);
    }
    return date.toISOString();
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (calendarView === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (calendarView === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (calendarView === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const getEventsForDate = (date) => {
    const dateString = date.toDateString();
    return events.filter(event => {
      const eventDate = new Date(event.date || event.dueDate || event.startTime);
      return eventDate.toDateString() === dateString;
    });
  };

  const formatEventTime = (event) => {
    if (event.type === 'assignment') {
      return `Due: ${new Date(event.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (event.startTime) {
      const start = new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const end = event.endTime ? new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return end ? `${start} - ${end}` : start;
    }
    return 'All day';
  };

  const getEventIcon = (type) => {
    const icons = {
      assignment: 'fas fa-tasks',
      lecture: 'fas fa-video',
      exam: 'fas fa-clipboard-check',
      meeting: 'fas fa-users',
      deadline: 'fas fa-clock',
      class: 'fas fa-chalkboard-teacher',
      office_hours: 'fas fa-door-open',
      event: 'fas fa-calendar-day'
    };
    return icons[type] || 'fas fa-calendar';
  };

  const getEventColor = (event) => {
    if (event.type === 'assignment') {
      const dueDate = new Date(event.dueDate);
      const now = new Date();
      const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);
      
      if (daysUntilDue < 0) return 'overdue';
      if (daysUntilDue <= 1) return 'urgent';
      if (daysUntilDue <= 3) return 'warning';
      return 'normal';
    }
    
    return event.priority || 'normal';
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const renderMonthView = () => {
    const startDate = new Date(currentDate);
    startDate.setDate(1);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days = [];
    const currentMonth = currentDate.getMonth();

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayEvents = getEventsForDate(date);
      const isCurrentMonth = date.getMonth() === currentMonth;
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();

      days.push(
        <div
          key={i}
          className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => setSelectedDate(date)}
        >
          <div className="day-header">
            <span className="day-number">{date.getDate()}</span>
          </div>
          <div className="day-events">
            {dayEvents.slice(0, 3).map((event, index) => (
              <div
                key={index}
                className={`event-item ${getEventColor(event)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEventClick(event);
                }}
              >
                <i className={getEventIcon(event.type)}></i>
                <span className="event-title">{event.title}</span>
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="more-events">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="calendar-grid month-view">
        <div className="calendar-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="day-header">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-body">
          {days}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div key={i} className={`week-day ${isToday ? 'today' : ''}`}>
          <div className="day-header">
            <div className="day-name">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div className="day-number">{date.getDate()}</div>
          </div>
          <div className="day-events">
            {dayEvents.map((event, index) => (
              <div
                key={index}
                className={`event-item ${getEventColor(event)}`}
                onClick={() => handleEventClick(event)}
              >
                <div className="event-time">{formatEventTime(event)}</div>
                <div className="event-title">
                  <i className={getEventIcon(event.type)}></i>
                  {event.title}
                </div>
                <div className="event-course">{event.course?.name}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return <div className="calendar-grid week-view">{days}</div>;
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate).sort((a, b) => {
      const timeA = new Date(a.startTime || a.dueDate || a.date);
      const timeB = new Date(b.startTime || b.dueDate || b.date);
      return timeA - timeB;
    });

    return (
      <div className="day-view">
        <div className="day-header">
          <h2>{currentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</h2>
        </div>
        <div className="day-events">
          {dayEvents.length > 0 ? (
            dayEvents.map((event, index) => (
              <div
                key={index}
                className={`event-card ${getEventColor(event)}`}
                onClick={() => handleEventClick(event)}
              >
                <div className="event-time">
                  <i className={getEventIcon(event.type)}></i>
                  {formatEventTime(event)}
                </div>
                <div className="event-content">
                  <h4>{event.title}</h4>
                  {event.course && <p className="event-course">{event.course.name}</p>}
                  {event.description && <p className="event-description">{event.description}</p>}
                </div>
              </div>
            ))
          ) : (
            <div className="no-events">
              <i className="fas fa-calendar-day"></i>
              <p>No events scheduled for this day</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading calendar...</div>;
  }

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <div className="calendar-title">
          <h1>Calendar</h1>
          <p>Manage your schedule and deadlines</p>
        </div>

        <div className="calendar-controls">
          <div className="view-selector">
            <button
              className={`view-btn ${calendarView === 'month' ? 'active' : ''}`}
              onClick={() => setCalendarView('month')}
            >
              Month
            </button>
            <button
              className={`view-btn ${calendarView === 'week' ? 'active' : ''}`}
              onClick={() => setCalendarView('week')}
            >
              Week
            </button>
            <button
              className={`view-btn ${calendarView === 'day' ? 'active' : ''}`}
              onClick={() => setCalendarView('day')}
            >
              Day
            </button>
          </div>

          <div className="navigation-controls">
            <button className="nav-btn" onClick={() => navigateDate(-1)}>
              <i className="fas fa-chevron-left"></i>
            </button>
            
            <div className="current-date">
              {calendarView === 'month' && (
                <span>{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              )}
              {calendarView === 'week' && (
                <span>Week of {currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              )}
              {calendarView === 'day' && (
                <span>{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              )}
            </div>

            <button className="nav-btn" onClick={() => navigateDate(1)}>
              <i className="fas fa-chevron-right"></i>
            </button>

            <button 
              className="today-btn"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-content">
        {calendarView === 'month' && renderMonthView()}
        {calendarView === 'week' && renderWeekView()}
        {calendarView === 'day' && renderDayView()}
      </div>

      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content event-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className={getEventIcon(selectedEvent.type)}></i>
                {selectedEvent.title}
              </h3>
              <button 
                className="modal-close"
                onClick={() => setShowEventModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="event-details">
                <div className="detail-item">
                  <strong>Time:</strong>
                  <span>{formatEventTime(selectedEvent)}</span>
                </div>

                {selectedEvent.course && (
                  <div className="detail-item">
                    <strong>Course:</strong>
                    <span>{selectedEvent.course.name} ({selectedEvent.course.code})</span>
                  </div>
                )}

                {selectedEvent.instructor && (
                  <div className="detail-item">
                    <strong>Instructor:</strong>
                    <span>{selectedEvent.instructor.name}</span>
                  </div>
                )}

                {selectedEvent.location && (
                  <div className="detail-item">
                    <strong>Location:</strong>
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="detail-item">
                    <strong>Description:</strong>
                    <p>{selectedEvent.description}</p>
                  </div>
                )}
              </div>

              <div className="event-actions">
                {selectedEvent.type === 'assignment' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      setShowEventModal(false);
                      navigate(`/assignments/${selectedEvent.assignmentId}`);
                    }}
                  >
                    <i className="fas fa-tasks"></i>
                    View Assignment
                  </button>
                )}
                
                {selectedEvent.type === 'lecture' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      setShowEventModal(false);
                      navigate('/video-lectures');
                    }}
                  >
                    <i className="fas fa-video"></i>
                    Watch Lecture
                  </button>
                )}

                <button 
                  className="btn btn-outline"
                  onClick={() => {
                    // Add to personal calendar functionality
                    toast.success('Event added to personal calendar');
                  }}
                >
                  <i className="fas fa-calendar-plus"></i>
                  Add to Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="calendar-legend">
        <h4>Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color assignment normal"></span>
            <span>Assignments</span>
          </div>
          <div className="legend-item">
            <span className="legend-color lecture"></span>
            <span>Lectures</span>
          </div>
          <div className="legend-item">
            <span className="legend-color exam"></span>
            <span>Exams</span>
          </div>
          <div className="legend-item">
            <span className="legend-color meeting"></span>
            <span>Meetings</span>
          </div>
          <div className="legend-item">
            <span className="legend-color urgent"></span>
            <span>Urgent</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;