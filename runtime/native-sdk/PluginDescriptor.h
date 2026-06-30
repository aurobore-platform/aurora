#ifndef AUROBORE_PLUGIN_DESCRIPTOR_H
#define AUROBORE_PLUGIN_DESCRIPTOR_H

#include <QString>
#include <QStringList>

struct PluginDescriptor
{
    QString display;
    QString name;
    QString version;
    int bridgeProtocol = 1;
    QStringList permissions;
    QStringList scopes;
    QStringList methods;
    QStringList events;
};

#endif
