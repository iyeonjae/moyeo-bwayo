import React, { useState } from 'react';

export default function App() {
  const [title, setTitle] = useState('');
  const [done, setDone] = useState(false);
  return (
    <div style={{fontFamily:'sans-serif',maxWidth:'600px',margin:'80px auto',padding:'0 20px',textAlign:'center'}}>
      <h1 style={{color:'#4F46E5',fontSize:'2rem'}}>모여봐요 🗓️</h1>
      <p style={{color:'#6B7280',marginBottom:'32px'}}>그룹 약속 잡기 서비스</p>
      {!done ? (
        <div style={{background:'#F9FAFB',borderRadius:'12px',padding:'32px'}}>
          <input value={title} onChange={e=>setTitle(e.target.value)}
            placeholder='약속 제목 입력 (예: MT 날짜 잡기)'
            style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #D1D5DB',fontSize:'16px',marginBottom:'16px',boxSizing:'border-box'}}
          />
          <button onClick={()=>title&&setDone(true)}
            style={{background:'#4F46E5',color:'white',border:'none',borderRadius:'8px',padding:'12px 32px',fontSize:'16px',cursor:'pointer',width:'100%'}}>
            방 만들기
          </button>
        </div>
      ) : (
        <div style={{background:'#F0FDF4',borderRadius:'12px',padding:'32px',border:'1px solid #BBF7D0'}}>
          <div style={{fontSize:'48px'}}>✅</div>
          <h2 style={{color:'#166534'}}>{title}</h2>
          <p style={{color:'#15803D'}}>링크가 생성되었습니다!</p>
          <button onClick={()=>{setTitle('');setDone(false);}}
            style={{background:'#16A34A',color:'white',border:'none',borderRadius:'8px',padding:'10px 24px',cursor:'pointer',marginTop:'16px'}}>
            새 약속 만들기
          </button>
        </div>
      )}
    </div>
  );
}