import { useState, useEffect } from 'react';
import { Send, ThumbsUp, AlertTriangle, X } from 'lucide-react';


interface Post {
    id: string;
    author: string;
    content: string;
    tag: string;
    timestamp: string;
    likes: number;
}

interface ForumProps {
    onClose: () => void;
}

export default function Forum({ onClose }: ForumProps) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [newPost, setNewPost] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [selectedTag, setSelectedTag] = useState('GENERAL');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const tags = ['GENERAL', 'PANIC', 'PHYSICS', 'MEME', 'HELP'];

    useEffect(() => {
        fetchPosts();
        // Poll for new posts every 10 seconds
        const interval = setInterval(fetchPosts, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchPosts = async () => {
        try {
            // Use relative URL for proxy
            const res = await fetch('/api/forum/posts');
            if (!res.ok) throw new Error('Failed to fetch posts');
            const data = await res.json();
            setPosts(data);
        } catch (err) {
            console.error(err);
            // Don't show error on polling failure to avoid annoyance
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPost.trim() || !authorName.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/forum/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author: authorName,
                    content: newPost,
                    tag: selectedTag
                })
            });

            if (!res.ok) throw new Error('Failed to post');

            setNewPost('');
            fetchPosts();
        } catch (err) {
            setError('Transmission failed. System jammed.');
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (id: string) => {
        try {
            const res = await fetch(`/api/forum/posts/${id}/like`, { method: 'POST' });
            if (res.ok) {
                setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
            }
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-terminal-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-4xl h-[80vh] terminal-box flex flex-col relative border-terminal-red shadow-[0_0_30px_rgba(220,38,38,0.2)]">

                {/* Header */}
                <div className="flex justify-between items-center border-b border-terminal-red/50 pb-4 mb-4">
                    <div className="flex items-center gap-3 text-terminal-red">
                        <AlertTriangle className="animate-pulse" />
                        <h2 className="text-2xl font-bold tracking-widest">PANIC_ROOM_V.1.0</h2>
                    </div>
                    <button onClick={onClose} className="text-terminal-dim hover:text-terminal-red transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                    {posts.length === 0 ? (
                        <div className="text-center text-terminal-dim py-20 opacity-50">
                            <p>NO_SIGNALS_DETECTED...</p>
                            <p className="text-xs mt-2">Be the first to break the silence.</p>
                        </div>
                    ) : (
                        posts.map(post => (
                            <div key={post.id} className="border border-terminal-dim/30 bg-terminal-dim/5 p-4 rounded hover:border-terminal-red/30 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-terminal-green text-sm">@{post.author}</span>
                                        <span className="text-[10px] text-terminal-dim border border-terminal-dim px-1 rounded">{post.tag}</span>
                                    </div>
                                    <span className="text-[10px] text-terminal-dim font-mono">{new Date(post.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-terminal-text text-sm font-mono leading-relaxed whitespace-pre-wrap">{post.content}</p>
                                <div className="mt-3 flex justify-end">
                                    <button
                                        onClick={() => handleLike(post.id)}
                                        className="text-xs text-terminal-dim hover:text-terminal-green flex items-center gap-1 transition-colors"
                                    >
                                        <ThumbsUp size={12} /> {post.likes}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="border-t border-terminal-red/30 pt-4">
                    {error && <div className="text-terminal-red text-xs mb-2 font-bold">ERROR: {error}</div>}

                    <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            placeholder="CODENAME"
                            value={authorName}
                            onChange={e => setAuthorName(e.target.value)}
                            className="bg-terminal-black border border-terminal-dim text-terminal-green px-3 py-1 text-xs w-32 outline-none focus:border-terminal-red placeholder-terminal-dim/50"
                            maxLength={15}
                        />
                        <select
                            value={selectedTag}
                            onChange={e => setSelectedTag(e.target.value)}
                            className="bg-terminal-black border border-terminal-dim text-terminal-green px-3 py-1 text-xs outline-none focus:border-terminal-red"
                        >
                            {tags.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newPost}
                            onChange={e => setNewPost(e.target.value)}
                            placeholder="TRANSMIT MESSAGE..."
                            className="flex-1 bg-terminal-black border border-terminal-dim text-terminal-text p-3 outline-none focus:border-terminal-red font-mono placeholder-terminal-dim/50"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={loading || !newPost.trim() || !authorName.trim()}
                            className="bg-terminal-red/10 border border-terminal-red text-terminal-red px-6 hover:bg-terminal-red hover:text-terminal-black transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-2"
                        >
                            {loading ? 'SENDING...' : <Send size={16} />}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
