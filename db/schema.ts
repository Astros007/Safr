import {sqliteTable,text,real,integer,index} from 'drizzle-orm/sqlite-core';
export const reports=sqliteTable('reports',{
 id:text('id').primaryKey(),author:text('author').notNull(),kind:text('kind').notNull(),lat:real('lat').notNull(),lon:real('lon').notNull(),note:text('note').notNull().default(''),status:text('status').notNull().default('active'),created:integer('created').notNull(),updated:integer('updated').notNull()
},t=>[index('reports_area').on(t.status,t.lat,t.lon),index('reports_author').on(t.author,t.created)]);
