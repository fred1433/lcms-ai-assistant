-- Table pour stocker les messages de la conversation
create table messages (
  id bigint generated by default as identity primary key,
  role text not null,
  content text not null,
  created_at timestamptz default now()
); 