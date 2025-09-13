# 🎬 SyncStream - Watch Together Platform

A premium, fully responsive watch-together platform that allows users to create private rooms, sync YouTube videos, and chat in real-time.

## ✨ Features

- **🎥 Synchronized Video Playback**: Everyone watches at the same time with perfect sync
- **💬 Real-time Chat**: Chat with friends while watching videos
- **🔒 Private Rooms**: Secure, private rooms with unique IDs
- **📱 Fully Responsive**: Works perfectly on desktop, tablet, and mobile
- **⚡ Real-time Updates**: Powered by Supabase real-time subscriptions
- **🎮 Host Controls**: Play/pause controls sync to all viewers
- **🔗 Easy Sharing**: Shareable room links

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Supabase (Database + Real-time)
- **Video Player**: YouTube Iframe API
- **Deployment**: GitHub Pages (Frontend) + Supabase (Backend)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd syncstream
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Copy the database schema (see below) and run it in the SQL editor

### 3. Configure the App

1. Open `config.js`
2. Replace the placeholder values with your Supabase credentials:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key-here'
};
```

### 4. Deploy to GitHub Pages

1. Push your code to a GitHub repository
2. Go to Settings > Pages
3. Select "Deploy from a branch" and choose your main branch
4. Your app will be available at `https://username.github.io/repository-name/`

## 🗄️ Database Schema

Run this SQL in your Supabase SQL editor:

```sql
-- Create rooms table
create table rooms (
  id text primary key,
  video_url text,
  created_at timestamp default now()
);

-- Create participants table
create table participants (
  id uuid primary key default gen_random_uuid(),
  room_id text references rooms(id) on delete cascade,
  name text,
  joined_at timestamp default now()
);

-- Create messages table
create table messages (
  id uuid primary key default gen_random_uuid(),
  room_id text references rooms(id) on delete cascade,
  sender_name text,
  message text,
  created_at timestamp default now()
);

-- Create video_state table
create table video_state (
  room_id text references rooms(id) on delete cascade,
  current_time float,
  is_playing boolean,
  updated_at timestamp default now()
);

-- Enable Row Level Security (RLS)
alter table rooms enable row level security;
alter table participants enable row level security;
alter table messages enable row level security;
alter table video_state enable row level security;

-- Create policies for public access (adjust as needed for your security requirements)
create policy "Allow all operations on rooms" on rooms for all using (true);
create policy "Allow all operations on participants" on participants for all using (true);
create policy "Allow all operations on messages" on messages for all using (true);
create policy "Allow all operations on video_state" on video_state for all using (true);

-- Enable real-time subscriptions
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table video_state;
alter publication supabase_realtime add table participants;
```

## 📁 Project Structure

```
syncstream/
├── index.html          # Landing page
├── room.html           # Room page with video player and chat
├── styles.css          # Shared CSS styles
├── config.js           # Supabase configuration and utilities
├── app.js              # Landing page JavaScript
├── room.js             # Room page JavaScript
└── README.md           # This file
```

## 🎯 How It Works

### Creating a Room
1. User enters a YouTube URL on the landing page
2. App generates a unique room ID and creates a room in Supabase
3. User gets a shareable link to invite friends

### Joining a Room
1. Users click the room link and enter their name
2. App adds them as a participant in the database
3. They can now chat and watch the synchronized video

### Video Synchronization
1. Host controls (play/pause) update the `video_state` table
2. All participants receive real-time updates via Supabase subscriptions
3. Video players automatically sync to the latest state

### Real-time Chat
1. Messages are stored in the `messages` table
2. Real-time subscriptions push new messages to all participants
3. System messages notify when users join/leave

## 🔧 Configuration Options

### Security Settings

For production use, consider implementing more restrictive RLS policies:

```sql
-- Example: Only allow users to access rooms they've joined
create policy "Users can only access their rooms" on messages 
for all using (
  room_id in (
    select room_id from participants 
    where name = current_setting('app.current_user')
  )
);
```

### Customization

- **Styling**: Modify `styles.css` to match your brand
- **Features**: Add new features by extending the database schema and JavaScript
- **Limits**: Adjust message limits, room expiration, etc. in the configuration

## 🚨 Troubleshooting

### Common Issues

1. **"Please configure Supabase credentials" error**
   - Make sure you've updated `config.js` with your actual Supabase URL and key

2. **Video not loading**
   - Ensure the YouTube URL is valid and the video is publicly accessible
   - Check browser console for YouTube API errors

3. **Real-time features not working**
   - Verify that real-time subscriptions are enabled in your Supabase project
   - Check that the tables are added to the `supabase_realtime` publication

4. **Database errors**
   - Ensure all tables are created with the correct schema
   - Check that RLS policies allow the necessary operations

### Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 📱 Mobile Support

The app is fully responsive and works on mobile devices. Note that some mobile browsers may have restrictions on autoplay videos.

## 🔒 Security Considerations

- All user input is sanitized to prevent XSS attacks
- Room IDs are randomly generated to prevent guessing
- Consider implementing rate limiting for message sending
- For production, implement proper authentication and authorization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Verify your Supabase configuration
4. Check that all database tables and policies are set up correctly

## 🎉 Deployment Checklist

- [ ] Supabase project created
- [ ] Database schema applied
- [ ] Real-time subscriptions enabled
- [ ] `config.js` updated with credentials
- [ ] App tested locally
- [ ] Repository pushed to GitHub
- [ ] GitHub Pages enabled
- [ ] Live app tested

---

**Enjoy watching together! 🍿**