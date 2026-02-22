import React from 'react'

export default function Modal({open, title, onClose, children}:{open:boolean, title?:string, onClose?:()=>void, children?:React.ReactNode}){
  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted">Close</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}
